#!/usr/bin/env node
/**
 * Deal-Autopilot – läuft alle 30 Min in GitHub Actions (.github/workflows/deal-autopilot.yml).
 *
 *  1. liest mydealz-RSS-Feeds (nur Händler Amazon, heiße Deals, Tech-Kategorien)
 *  2. ermittelt die ASIN und baut den eigenen Partnerlink (Tracking-ID telegram)
 *  3. postet in den Telegram-Kanal (Grafik mit Bild, Preis, Ersparnis)
 *  4. schreibt data/auto-deals.json → erscheint automatisch auf /deals
 *
 *   node scripts/autopilot.mjs          echter Lauf
 *   node scripts/autopilot.mjs --dry    nur anzeigen, nichts posten/speichern
 *
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID (lokal aus .env.local)
 */
import { readFile, writeFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { postDeal, shareButton, telegramApi, telegramConfigured } from "./telegram.mjs";
import { processInbox } from "./inbox.mjs";
import { sendAlertOnce } from "./alert.mjs";
import { categorize } from "./categories.mjs";
import { dealScore } from "./rating.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILES = {
  config: path.join(ROOT, "data", "deals.json"),
  auto: path.join(ROOT, "data", "auto-deals.json"),
  state: path.join(ROOT, "data", "autopilot-state.json"),
  queue: path.join(ROOT, "data", "queue.json"),
  queueDir: path.join(ROOT, "data", "queue"),
};
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const DAY = 24 * 3600 * 1000;
const REPOST_AFTER = 7 * DAY;
const MAX_LIST = 150; // Deals auf der Seite
const SITE_PER_RUN = 60; // neue Deals pro Lauf auf die Seite
const MAX_LOOKUPS = 60; // ASIN-Abfragen bei mydealz pro Lauf
const DRY = process.argv.includes("--dry");

const readJSON = async (f, fallback) => {
  try {
    return JSON.parse(await readFile(f, "utf8"));
  } catch {
    return fallback;
  }
};
const writeJSON = (f, v) => writeFile(f, JSON.stringify(v, null, 2) + "\n");

// ---------- Hilfsfunktionen ----------

function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .trim();
}

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : "";
}

/** "1.299,99€" → 1299.99 */
function parseEuro(s) {
  if (!s) return undefined;
  const clean = s.replace(/[^\d,.]/g, "");
  if (!clean) return undefined;
  const n = Number(clean.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Vergleichspreis aus Titel/Beschreibung ("statt 49,99€", "UVP 59 €", "VGP: 45€") */
function findReferencePrice(text, price) {
  const re =
    /(?:statt|UVP|VGP|PVG|Vergleichspreis|Preisvergleich(?:\s+\S+){0,6}?\s+(?:bei|von|ab)|zuvor|sonst)\s*:?\s*(?:ca\.\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR|Euro)/gi;
  let best;
  for (const m of text.matchAll(re)) {
    const v = parseEuro(m[1]);
    if (v && v > price * 1.05 && v < price * 10) best = Math.max(best ?? 0, v);
  }
  return best;
}

function cleanTitle(raw) {
  let t = raw
    .replace(/^\s*-?\d+°\s*-\s*/, "") // Temperatur
    .replace(/^\s*(?:\[[^\]]*\]\s*)+/, "") // [prime früher Black Friday]
    .replace(/^\s*\([^)]*\)\s*/, "") // (TANLINK-EUR@Amazon) am Anfang
    .replace(/\s*(?:@|►|-\s*Amazon\b|\|\s*Amazon\b)[\s\S]*$/i, "")
    .replace(/\[[^\]]*amazon[^\]]*\]/gi, "")
    .replace(/\((?:[^)]*prime[^)]*|[^)]*amazon[^)]*)\)/gi, "")
    .replace(/\s+(?:für|ab|nur|zum|um)\s+\d[\d.,]*\s*(?:€|EUR|Euro)[\s\S]*$/i, "")
    .replace(/\s+-\s*Prime\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  t = t
    .replace(/\s+bei Amazon\b[\s\S]*$/i, "")
    .replace(/\s*\+\s*\d*\s*-?fach Payback[\s\S]*$/i, "")
    .replace(/\s+(?:\(?Amazon Prime\)?|\(?Prime\)?)\s*$/i, "")
    .replace(/\s+verschiedene (?:Farben|Modelle|Größen)[\s\S]*$/i, "")
    .trim();
  // "Marke Modell • Typ • Feature • …" → "Marke Modell – Typ"
  const bullets = t.split(/\s+[•·]\s+/);
  if (bullets.length > 2) t = bullets.slice(0, 2).join(" – ");
  // "Produkt | Variante | Amazon Prime / Joybuy" → "Produkt"
  const first = t.split(/\s+[|►]\s+/)[0];
  if (first.length >= 15) t = first;
  // lange Klammer-Zusätze entfernen
  if (t.length > 55) t = t.replace(/\s*\([^)]*\)?\s*$/, "").replace(/\s*\([^)]{15,}\)/g, "").trim();
  if (t.length > 70) t = t.slice(0, t.lastIndexOf(" ", 70)).trim() + " …";
  return t;
}

function berlinNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}

function berlinDay(iso) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date(iso));
}

function isQuiet(hour, [from, to]) {
  return from > to ? hour >= from || hour < to : hour >= from && hour < to;
}

function categoryFor(it) {
  return categorize(cleanTitle(it.title), it.feed);
}

// ---------- mydealz ----------

async function readFeed(feed) {
  const res = await fetch(`https://www.mydealz.de/rss/${feed}`, {
    headers: { "User-Agent": UA, Accept: "application/rss+xml, text/xml" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Feed ${feed}: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
    const merchant = it.match(/<pepper:merchant\s+name="([^"]*)"(?:\s+price="([^"]*)")?/);
    const media = it.match(/<media:content[^>]*url="([^"]+)"/)?.[1];
    const title = tag(it, "title");
    const link = tag(it, "link");
    return {
      title,
      link,
      threadId: link.match(/-(\d+)(?:[/?#]|$)/)?.[1],
      category: tag(it, "category"),
      description: tag(it, "description").replace(/<[^>]+>/g, " "),
      merchant: merchant?.[1] ?? "",
      price: parseEuro(merchant?.[2]),
      // Kategorie-Feeds enthalten keine Temperatur → null = unbekannt
      temperature: title.match(/^\s*(-?\d+)°/) ? Number(title.match(/^\s*(-?\d+)°/)[1]) : null,
      pubDate: tag(it, "pubDate"),
      // Vorschaubild aus dem Feed (nur Ersatz, falls Amazon kein Bild zur ASIN liefert)
      image: media ? media.replace(/\/re\/\d+x\d+\//, "/re/768x768/") : undefined,
    };
  });
}

/** ASIN über die Weiterleitung des Deals ermitteln (eine Anfrage, Amazon wird nicht aufgerufen). */
async function resolveAsin(threadId) {
  const res = await fetch(`https://www.mydealz.de/visit/threadmain/${threadId}`, {
    headers: { "User-Agent": UA },
    redirect: "manual",
  });
  const loc = res.headers.get("location") ?? "";
  const target = (() => {
    try {
      return new URL(loc).searchParams.get("url") ?? loc;
    } catch {
      return loc;
    }
  })();
  if (!/amazon\.de/i.test(target)) return null;
  return target.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i)?.[1]?.toUpperCase() ?? null;
}

// ---------- Produktbild ----------

async function imageOk(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) return false;
    return (await res.arrayBuffer()).byteLength > 1000; // Amazon liefert sonst ein 1×1-GIF
  } catch {
    return false;
  }
}

/** Bestes verfügbares Bild: Amazon.de → Amazon.com → Feed-Bild. */
async function pickImage(asin, fallback) {
  for (const market of ["03", "01"]) {
    const url = `https://m.media-amazon.com/images/P/${asin}.${market}._SCLZZZZZZZ_SX500_.jpg`;
    if (await imageOk(url)) return url;
  }
  if (fallback && (await imageOk(fallback))) return fallback;
  return undefined;
}

// ---------- Modus & Tages-Top-5 ----------

/** Normalbetrieb oder Black-Friday-Turbo (data/deals.json → autopilot.blackFriday). */
function activeMode(cfg, day) {
  const bf = cfg.blackFriday;
  if (bf && day >= bf.from && day <= bf.to) {
    const peakDay = (bf.peakDays ?? []).includes(day);
    return {
      name: peakDay ? "Black Friday (Haupttag)" : "Black Friday",
      intervalMinutes: bf.intervalMinutes,
      maxPerRun: peakDay ? bf.peakDayMaxPerRun ?? bf.maxPerRun : bf.maxPerRun,
      offPeakPerRun: peakDay ? bf.maxPerRun : bf.offPeakPerRun,
      maxPerDay: peakDay ? bf.peakDayMaxPerDay ?? bf.maxPerDay : bf.maxPerDay,
      queuePerRun: bf.queuePerRun ?? 2,
    };
  }
  return {
    name: "Normal",
    intervalMinutes: cfg.intervalMinutes ?? 30,
    maxPerRun: cfg.maxPerRun,
    offPeakPerRun: cfg.offPeakPerRun ?? cfg.maxPerRun,
    maxPerDay: cfg.maxPerDay,
  };
}

const eur = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Einmal am Tag (Standard 19 Uhr) die besten Deals des Tages zusammenfassen. */
async function maybeDigest(cfg, config, state, list, day, hour) {
  const d = cfg.digest;
  if (!d?.enabled || DRY || hour < d.hour || state.digestDay === day) return;
  const today = list
    .filter((x) => x.telegramPostedAt && berlinDay(x.telegramPostedAt) === day)
    .map((x) => ({ ...x, save: x.oldPrice && x.price ? x.oldPrice - x.price : 0 }))
    .sort((a, b) => b.save - a.save || (b.oldPrice ? 1 : 0) - (a.oldPrice ? 1 : 0))
    .slice(0, d.count);
  if (today.length < 3) {
    state.digestDay = day; // zu wenige Deals – heute keine Zusammenfassung
    return;
  }
  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣"];
  const lines = [
    `🏆 <b>Top ${today.length} Deals des Tages</b>`,
    "",
    ...today.map((x, i) => {
      const url = `https://www.amazon.de/dp/${x.asin}?tag=${config.tracking.telegram}`;
      const save = x.save > 0 ? ` · spare ${eur(x.save)}` : "";
      return `${medals[i]} <a href="${url}">${escHtml(x.title)}</a>\n     <b>${eur(x.price)}</b>${save}`;
    }),
    "",
    "<i>Preise Stand heute, können sich jederzeit ändern.</i>",
    "#TopDeals · #Anzeige · Als Amazon-Partner verdiene ich an qualifizierten Verkäufen.",
  ];
  const share = await shareButton();
  try {
    await telegramApi("sendMessage", {
      text: lines.join("\n"),
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: share ? { inline_keyboard: [[share]] } : undefined,
    });
    state.digestDay = day;
    console.log(`🏆 Tages-Top-${today.length} gepostet`);
  } catch (e) {
    console.warn("⚠️  Top-Deals:", e.message);
  }
}

// ---------- Warteschlange ----------

/** Sammelt data/queue/*.json ein (vom Telegram-Webhook) und postet pro Lauf 1–2 Deals daraus. */
async function drainQueue(cfg, config, state, list, hour, mode) {
  const queue = await readJSON(FILES.queue, []);
  let files = [];
  try {
    files = (await readdir(FILES.queueDir)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    /* Ordner existiert noch nicht */
  }
  for (const f of files) {
    const items = await readJSON(path.join(FILES.queueDir, f), []);
    for (const it of items) if (!queue.some((q) => q.asin === it.asin)) queue.push(it);
    await unlink(path.join(FILES.queueDir, f));
  }

  const perRun = isQuiet(hour, cfg.quietHours) ? 0 : mode.queuePerRun ?? 1;
  let posted = 0;
  while (posted < perRun && queue.length) {
    const it = queue.shift();
    const fresh = Date.now() - Date.parse(it.addedAt) <= 20 * 3600 * 1000;
    const deal = {
      id: `queue-${it.asin.toLowerCase()}`,
      asin: it.asin,
      title: it.title,
      subtitle: it.note,
      category: categorize(it.title, "", it.category),
      // Preis älter als 20 h → ohne Preis posten (Amazon-Regel: Preise max. 24 h)
      price: fresh ? it.price : undefined,
      oldPrice: fresh ? it.oldPrice : undefined,
      checkedAt: fresh ? it.addedAt : new Date().toISOString(),
      image: await pickImage(it.asin, it.image),
      ...(it.temperature ? { temperature: it.temperature } : {}),
      source: "auto",
    };
    try {
      await postDeal(deal, config.campaign, config.tracking.telegram);
      deal.telegramPostedAt = new Date().toISOString();
      state.posted[it.asin] = deal.telegramPostedAt;
      const i = list.findIndex((d) => d.asin === it.asin);
      if (i >= 0) list.splice(i, 1);
      if (deal.price) list.unshift(deal);
      posted++;
      console.log(`📋 Warteschlange gepostet: ${deal.title} (${it.asin}) · noch ${queue.length}`);
    } catch (e) {
      console.warn(`⚠️  Warteschlange ${it.asin}: ${e.message}`);
    }
  }
  if (files.length || posted) {
    await writeJSON(FILES.queue, queue);
    await writeJSON(FILES.auto, list.slice(0, MAX_LIST));
    await writeJSON(FILES.state, state);
  }
  if (queue.length || files.length) console.log(`Warteschlange: ${queue.length} wartend`);
}

// ---------- Ablauf ----------

async function main() {
  const config = await readJSON(FILES.config, {});
  const cfg = config.autopilot;
  if (!cfg?.enabled) return console.log("Autopilot ist deaktiviert (data/deals.json → autopilot.enabled).");
  if (!DRY && !telegramConfigured()) throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID fehlen");

  const state = await readJSON(FILES.state, { posted: {}, threads: {} });
  const auto = await readJSON(FILES.auto, []);
  const now = Date.now();
  const { day, hour } = berlinNow();
  const mode = activeMode(cfg, day);

  // Deal-Inbox zuerst: von dir per Telegram geschickte Links sofort posten
  if (telegramConfigured()) {
    const n = await processInbox({ config, state, list: auto, dry: DRY });
    if (n && !DRY) {
      await writeJSON(FILES.auto, auto.slice(0, MAX_LIST));
      await writeJSON(FILES.state, state);
    }
  }

  // Warteschlange (per Telegram eingereichte Links) – bei jedem Lauf, unabhängig vom Intervall
  if (!DRY && telegramConfigured()) await drainQueue(cfg, config, state, auto, hour, mode);

  // Läuft alle 15 Min (GitHub); im Normalbetrieb nur alle 30 Min wirklich posten
  if (!DRY && state.lastRunAt && now - Date.parse(state.lastRunAt) < (mode.intervalMinutes - 3) * 60000) {
    console.log(`Nächster Lauf erst nach ${mode.intervalMinutes} Min (Modus: ${mode.name}).`);
    await maybeDigest(cfg, config, state, auto, day, hour);
    await writeJSON(FILES.state, state);
    return;
  }

  // Alte Einträge aufräumen
  for (const [asin, at] of Object.entries(state.posted)) if (now - Date.parse(at) > REPOST_AFTER) delete state.posted[asin];
  for (const [id, v] of Object.entries(state.threads)) if (now - Date.parse(v.at) > REPOST_AFTER) delete state.threads[id];
  const list = auto.filter((d) => now - Date.parse(d.checkedAt) <= DAY);

  // Feeds lesen
  const items = new Map();
  for (const feed of cfg.feeds) {
    try {
      for (const it of await readFeed(feed)) if (it.threadId && !items.has(it.threadId)) items.set(it.threadId, { ...it, feed });
    } catch (e) {
      console.warn("⚠️ ", e.message);
    }
  }

  if (items.size === 0 && !DRY) {
    await sendAlertOnce(
      state,
      "feeds",
      "Die mydealz-Feeds liefern keine Deals mehr (evtl. vorübergehend gesperrt oder geändert). Telegram-Inbox und Warteschlange laufen weiter."
    );
  }

  const manualAsins = new Set((config.deals ?? []).map((d) => d.asin));
  const candidates = [...items.values()]
    .filter((it) => /^amazon(\.de)?$/i.test(it.merchant.trim()))
    // Themen-Feeds (gruppe/…) sind schon passend; nur allgemeine Feeds nach Kategorie filtern
    .filter((it) => !(cfg.generalFeeds ?? []).includes(it.feed) || cfg.categories.includes(it.category))
    .filter((it) => it.temperature === null || it.temperature >= (mode.name.startsWith("Black Friday") ? Math.min(cfg.minTemperature, 30) : cfg.minTemperature))
    .filter((it) => it.price && it.price >= cfg.minPrice && it.price <= cfg.maxPrice)
    .filter((it) => it.pubDate && now - Date.parse(it.pubDate) <= cfg.maxAgeHours * 3600 * 1000)
    .map((it) => ({ ...it, oldPrice: findReferencePrice(`${it.title} ${it.description}`, it.price) }))
    .filter((it) => !cfg.requireSavings || it.oldPrice)
    // Beste Deals zuerst (Hot → Gut → Solide, dann Rabatt/Temperatur), dann neueste
    .sort((a, b) => dealScore(b) - dealScore(a) || Date.parse(b.pubDate) - Date.parse(a.pubDate));

  const postedToday = Object.values(state.posted).filter((at) => berlinDay(at) === day).length;
  const peak = (cfg.peakHours ?? []).some(([from, to]) => hour >= from && hour < to);
  const perRun = peak ? mode.maxPerRun : mode.offPeakPerRun;
  let budget = isQuiet(hour, cfg.quietHours) ? 0 : Math.min(perRun, Math.max(0, mode.maxPerDay - postedToday));

  console.log(
    `Modus: ${mode.name}${peak ? " · Stoßzeit" : ""} · Feeds: ${items.size} Deals · passend: ${candidates.length} · ` +
      `heute gepostet: ${postedToday} · Budget: ${budget}${isQuiet(hour, cfg.quietHours) ? " (Ruhezeit)" : ""}${DRY ? " · TESTLAUF" : ""}`
  );

  // Seite: ALLE passenden Deals (bis MAX_LIST). Telegram: nur die besten, im Rahmen des Budgets.
  const posted = [];
  const postErrors = [];
  let siteAdded = 0;
  let lookups = 0;
  for (const it of candidates) {
    if (DRY && posted.length >= 15) break;
    if (!DRY && budget <= 0 && (siteAdded >= SITE_PER_RUN || list.length >= MAX_LIST)) break;

    let asin = state.threads[it.threadId]?.asin;
    if (asin === undefined) {
      if (lookups >= MAX_LOOKUPS) continue; // mydealz schonen; Rest beim nächsten Lauf
      lookups++;
      try {
        asin = await resolveAsin(it.threadId);
      } catch {
        asin = null;
      }
      state.threads[it.threadId] = { asin, at: new Date().toISOString() };
    }
    if (!asin || state.posted[asin] || manualAsins.has(asin)) continue;

    // Schon auf der Seite (noch nicht auf Telegram) → nur posten, wenn Budget da ist
    const onSite = list.find((d) => d.asin === asin);
    if (onSite) {
      if (DRY || budget <= 0) continue;
      try {
        await postDeal(onSite, config.campaign, config.tracking.telegram);
        onSite.telegramPostedAt = new Date().toISOString();
        state.posted[asin] = onSite.telegramPostedAt;
        posted.push(asin);
        budget--;
        console.log(`📣 ${onSite.title} (${asin})`);
      } catch (e) {
        postErrors.push(e.message);
      }
      continue;
    }
    if (!DRY && budget <= 0 && (siteAdded >= SITE_PER_RUN || list.length >= MAX_LIST)) continue;

    const deal = {
      id: `auto-${asin.toLowerCase()}`,
      asin,
      title: cleanTitle(it.title),
      subtitle: it.temperature ? `🔥 ${it.temperature}° bei mydealz` : undefined,
      category: categoryFor(it),
      price: it.price,
      oldPrice: it.oldPrice,
      oldPriceLabel: it.oldPrice ? "Vergleichspreis" : undefined,
      checkedAt: new Date(Date.parse(it.pubDate)).toISOString(),
      image: await pickImage(asin, it.image),
      ...(it.temperature ? { temperature: it.temperature } : {}),
      source: "auto",
    };

    if (DRY) {
      console.log(`  • ${deal.title} – ${deal.price} €${deal.oldPrice ? ` (Vergl. ${deal.oldPrice} €)` : ""} · ${it.temperature ?? "?"}° · ${asin}`);
      posted.push(asin);
      continue;
    }

    list.unshift(deal);
    siteAdded++;
    if (budget <= 0) continue; // nur Seite
    try {
      await postDeal(deal, config.campaign, config.tracking.telegram);
      deal.telegramPostedAt = new Date().toISOString();
      state.posted[asin] = deal.telegramPostedAt;
      posted.push(asin);
      budget--;
      console.log(`📣 ${deal.title} (${asin})`);
    } catch (e) {
      postErrors.push(e.message);
      console.warn(`⚠️  ${asin}: ${e.message}`);
    }
  }
  if (siteAdded) console.log(`🌐 ${siteAdded} neue Deals auf der Seite (davon ${posted.length} auch auf Telegram)`);

  if (!DRY && postErrors.length && !posted.length) {
    await sendAlertOnce(state, "post", `Posten in den Kanal schlägt fehl: <code>${postErrors[0].replace(/</g, "&lt;")}</code>
(Token abgelaufen oder Bot kein Admin mehr?)`);
  }

  if (DRY) return console.log(posted.length ? "Testlauf beendet – nichts gepostet." : "Keine passenden Deals gefunden.");

  state.lastRunAt = new Date().toISOString();
  await maybeDigest(cfg, config, state, list, day, hour);
  await writeJSON(FILES.auto, list.slice(0, MAX_LIST));
  await writeJSON(FILES.state, state);
  console.log(`Fertig: ${posted.length} gepostet, ${Math.min(list.length, MAX_LIST)} auf der Seite.`);
}

// Nur ausführen, wenn direkt gestartet (nicht beim Import durch curator.mjs)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    console.error("❌", e.message);
    process.exit(1);
  });
}

export { readFeed, resolveAsin, findReferencePrice, cleanTitle, categoryFor, readJSON, writeJSON, pickImage, FILES };
export { categorize };
