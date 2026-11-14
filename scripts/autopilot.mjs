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
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { postDeal, shareButton, telegramApi, telegramConfigured } from "./telegram.mjs";
import { processInbox } from "./inbox.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILES = {
  config: path.join(ROOT, "data", "deals.json"),
  auto: path.join(ROOT, "data", "auto-deals.json"),
  state: path.join(ROOT, "data", "autopilot-state.json"),
};
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const DAY = 24 * 3600 * 1000;
const REPOST_AFTER = 7 * DAY;
const MAX_LIST = 60;
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

const FEED_CATEGORY = {
  "gruppe/kopfhoerer": "Audio",
  "gruppe/lautsprecher": "Audio",
  "gruppe/computer": "Computer",
  "gruppe/monitor": "Computer",
  "gruppe/ssd": "Computer",
  "gruppe/drucker": "Computer",
  "gruppe/smartphone": "Smartphone",
  "gruppe/tablet": "Smartphone",
  "gruppe/smartwatch": "Smartphone",
  "gruppe/apple": "Apple",
  "gruppe/kamera": "Foto",
  "gruppe/fernseher": "TV",
  "gruppe/smart-home": "Smart Home",
  "gruppe/staubsauger": "Haushalt",
  "gruppe/haushaltsgeraete": "Haushalt",
  "gruppe/kueche": "Haushalt",
  "gruppe/werkzeug": "Werkzeug",
  "gruppe/gaming": "Gaming",
  "gruppe/playstation": "Gaming",
  "gruppe/nintendo": "Gaming",
  "gruppe/xbox": "Gaming",
};

function categoryFor(it) {
  if (FEED_CATEGORY[it.feed]) return FEED_CATEGORY[it.feed];
  if (it.category === "Gaming") return "Gaming";
  if (it.category === "Garten & Baumarkt") return "Werkzeug";
  if (it.category === "Home & Living") return "Haushalt";
  return "Tech";
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

// ---------- Modus & Tages-Top-5 ----------

/** Normalbetrieb oder Black-Friday-Turbo (data/deals.json → autopilot.blackFriday). */
function activeMode(cfg, day) {
  const bf = cfg.blackFriday;
  if (bf && day >= bf.from && day <= bf.to) {
    return { name: "Black Friday", intervalMinutes: bf.intervalMinutes, maxPerRun: bf.maxPerRun, offPeakPerRun: bf.offPeakPerRun, maxPerDay: bf.maxPerDay };
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

  const manualAsins = new Set((config.deals ?? []).map((d) => d.asin));
  const candidates = [...items.values()]
    .filter((it) => /^amazon(\.de)?$/i.test(it.merchant.trim()))
    // Themen-Feeds (gruppe/…) sind schon passend; nur allgemeine Feeds nach Kategorie filtern
    .filter((it) => !(cfg.generalFeeds ?? []).includes(it.feed) || cfg.categories.includes(it.category))
    .filter((it) => it.temperature === null || it.temperature >= cfg.minTemperature)
    .filter((it) => it.price && it.price >= cfg.minPrice && it.price <= cfg.maxPrice)
    .filter((it) => it.pubDate && now - Date.parse(it.pubDate) <= cfg.maxAgeHours * 3600 * 1000)
    .map((it) => ({ ...it, oldPrice: findReferencePrice(`${it.title} ${it.description}`, it.price) }))
    .filter((it) => !cfg.requireSavings || it.oldPrice)
    // Deals mit Ersparnis zuerst, dann heißeste, dann neueste
    .sort(
      (a, b) =>
        Number(!!b.oldPrice) - Number(!!a.oldPrice) ||
        (b.temperature ?? 0) - (a.temperature ?? 0) ||
        Date.parse(b.pubDate) - Date.parse(a.pubDate)
    );

  const postedToday = Object.values(state.posted).filter((at) => berlinDay(at) === day).length;
  const peak = (cfg.peakHours ?? []).some(([from, to]) => hour >= from && hour < to);
  const perRun = peak ? mode.maxPerRun : mode.offPeakPerRun;
  let budget = isQuiet(hour, cfg.quietHours) ? 0 : Math.min(perRun, Math.max(0, mode.maxPerDay - postedToday));

  console.log(
    `Modus: ${mode.name}${peak ? " · Stoßzeit" : ""} · Feeds: ${items.size} Deals · passend: ${candidates.length} · ` +
      `heute gepostet: ${postedToday} · Budget: ${budget}${isQuiet(hour, cfg.quietHours) ? " (Ruhezeit)" : ""}${DRY ? " · TESTLAUF" : ""}`
  );

  const posted = [];
  for (const it of candidates) {
    if (!DRY && budget <= 0) break;
    if (DRY && posted.length >= 15) break;

    let asin = state.threads[it.threadId]?.asin;
    if (asin === undefined) {
      try {
        asin = await resolveAsin(it.threadId);
      } catch {
        asin = null;
      }
      state.threads[it.threadId] = { asin, at: new Date().toISOString() };
    }
    if (!asin || state.posted[asin] || manualAsins.has(asin) || list.some((d) => d.asin === asin)) continue;

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
      source: "auto",
    };

    if (DRY) {
      console.log(`  • ${deal.title} – ${deal.price} €${deal.oldPrice ? ` (Vergl. ${deal.oldPrice} €)` : ""} · ${it.temperature ?? "?"}° · ${asin}`);
      posted.push(asin);
      continue;
    }

    try {
      await postDeal(deal, config.campaign, config.tracking.telegram);
      deal.telegramPostedAt = new Date().toISOString();
      state.posted[asin] = deal.telegramPostedAt;
      list.unshift(deal);
      posted.push(asin);
      budget--;
      console.log(`📣 ${deal.title} (${asin})`);
    } catch (e) {
      console.warn(`⚠️  ${asin}: ${e.message}`);
    }
  }

  if (DRY) return console.log(posted.length ? "Testlauf beendet – nichts gepostet." : "Keine passenden Deals gefunden.");

  state.lastRunAt = new Date().toISOString();
  await maybeDigest(cfg, config, state, list, day, hour);
  await writeJSON(FILES.auto, list.slice(0, MAX_LIST));
  await writeJSON(FILES.state, state);
  console.log(`Fertig: ${posted.length} gepostet, ${Math.min(list.length, MAX_LIST)} auf der Seite.`);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
