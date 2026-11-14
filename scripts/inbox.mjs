/**
 * Deal-Inbox: Du schickst dem Bot privat einen Amazon-Link (gern mit Preis),
 * der Autopilot postet ihn beim nächsten Lauf mit DEINER Tracking-ID.
 *
 * Beispiele für Nachrichten an den Bot:
 *   https://amzn.to/3xyz 29,99€ statt 49,99€
 *   Anker Powerbank 20000 mAh
 *   https://www.amazon.de/dp/B0ABCDEFGH 24,99 € UVP 39,99 €
 *
 * Erste Zeile ohne Link = Titel. Erster €-Preis = Dealpreis, "statt/UVP/…" = Vergleichspreis.
 * Nur Nachrichten von IDs in data/deals.json → telegram.ownerIds werden gepostet.
 */
import { postDeal, telegramApi } from "./telegram.mjs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const ASIN_RE = /\/(?:dp|gp\/product|gp\/aw\/d|d)\/([A-Z0-9]{10})(?=[/?#]|$)/i;
const SHORT_RE = /^https?:\/\/(?:amzn\.to|amzn\.eu|a\.co)\//i;

function parseEuro(s) {
  const clean = String(s).replace(/[^\d,.]/g, "");
  const n = Number(clean.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

async function resolveAsin(url) {
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    const m = current.match(ASIN_RE);
    if (m && /amazon\./i.test(current)) return m[1].toUpperCase();
    if (!SHORT_RE.test(current) && hop > 0) break;
    // Kurzlink: nur den Redirect-Header lesen, keine Produktseite laden
    const res = await fetch(current, { method: "HEAD", redirect: "manual", headers: { "User-Agent": UA } });
    const loc = res.headers.get("location");
    if (!loc) break;
    current = new URL(loc, current).toString();
  }
  const m = current.match(ASIN_RE);
  return m && /amazon\./i.test(current) ? m[1].toUpperCase() : null;
}

function parseMessage(text) {
  const urls = text.match(/https?:\/\/\S+/g) ?? [];
  const amazonUrl = urls.find((u) => /amazon\.|amzn\.to|amzn\.eu|a\.co\//i.test(u));
  const priceRe = /(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR|Euro)/gi;
  const refRe =
    /(?:statt|UVP|VGP|PVG|Vergleichspreis|zuvor|sonst|vorher)\s*:?\s*(?:ca\.\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR|Euro)?/i;

  const ref = text.match(refRe);
  const oldPrice = ref ? parseEuro(ref[1]) : undefined;
  const withoutRef = ref ? text.replace(ref[0], " ") : text;
  const prices = [...withoutRef.matchAll(priceRe)].map((m) => parseEuro(m[1])).filter(Boolean);
  const price = prices[0];

  const titleLine = text
    .split("\n")
    .map((l) =>
      l
        .replace(/https?:\/\/\S+/g, "")
        .replace(new RegExp(refRe.source, "gi"), "")
        .replace(priceRe, "")
        .replace(/\(\s*\)|\[\s*\]/g, "")
        .replace(/\s+(?:für|ab|nur|um|zum|statt)\s*$/i, "")
        .replace(/\s{2,}/g, " ")
        .replace(/[\p{Extended_Pictographic}️]/gu, "")
        .replace(/[|•\-–:]+\s*$/g, "")
        .trim()
    )
    .find((l) => l.length >= 4);

  return {
    amazonUrl,
    price,
    oldPrice: oldPrice && price && oldPrice > price ? oldPrice : undefined,
    title: titleLine ? (titleLine.length > 70 ? titleLine.slice(0, titleLine.lastIndexOf(" ", 70)) + " …" : titleLine) : undefined,
  };
}

async function reply(chatId, text) {
  try {
    await telegramApi("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } });
  } catch (e) {
    console.warn("⚠️  Antwort an Inbox fehlgeschlagen:", e.message);
  }
}

/** Liest neue Nachrichten an den Bot und postet Deals. Gibt Anzahl geposteter Deals zurück. */
export async function processInbox({ config, state, list, dry }) {
  const owners = (config.telegram?.ownerIds ?? []).map(String);
  let updates;
  try {
    updates = await telegramApi("getUpdates", {
      offset: (state.updateOffset ?? 0) + 1,
      timeout: 0,
      allowed_updates: ["message"],
    });
  } catch (e) {
    console.warn("⚠️  Inbox:", e.message);
    return 0;
  }
  if (!updates.length) return 0;

  let posted = 0;
  for (const u of updates) {
    if (!dry) state.updateOffset = u.update_id;
    const msg = u.message;
    if (!msg || msg.chat?.type !== "private") continue;
    const from = String(msg.from?.id ?? "");
    const text = (msg.text ?? msg.caption ?? "").trim();

    if (!owners.includes(from)) {
      console.log(`Inbox: Nachricht von unbekannter ID ${from}`);
      if (!dry && owners.length === 0) {
        await reply(msg.chat.id, `👋 Deine Telegram-ID ist <code>${from}</code>.\nTrage sie in data/deals.json → telegram.ownerIds ein, dann kannst du mir Deals schicken.`);
      }
      continue;
    }

    if (!text || text === "/start" || text === "/hilfe") {
      if (!dry)
        await reply(
          msg.chat.id,
          "📥 <b>Deal-Inbox</b>\nSchick mir einen Amazon-Link, gern mit Titel und Preis:\n\n<code>Anker Powerbank 20000 mAh\nhttps://amzn.to/… 29,99€ statt 49,99€</code>\n\nIch poste ihn mit deinem Partnerlink (spätestens nach 15 Min)."
        );
      continue;
    }

    const p = parseMessage(text);
    if (!p.amazonUrl) {
      if (!dry) await reply(msg.chat.id, "❓ Ich habe keinen Amazon-Link gefunden.");
      continue;
    }

    let asin = null;
    try {
      asin = await resolveAsin(p.amazonUrl.replace(/[),.]+$/, ""));
    } catch {
      /* unten behandelt */
    }
    if (!asin) {
      if (!dry) await reply(msg.chat.id, "❌ Konnte aus dem Link keine Amazon-Produkt-ID (ASIN) lesen.");
      continue;
    }

    const deal = {
      id: `inbox-${asin.toLowerCase()}`,
      asin,
      title: p.title ?? "Amazon-Deal",
      category: "Tech",
      price: p.price,
      oldPrice: p.oldPrice,
      checkedAt: new Date(msg.date * 1000).toISOString(),
      source: "auto",
    };

    if (dry) {
      console.log(`Inbox (Test): ${deal.title} · ${asin} · ${deal.price ?? "–"} € (statt ${deal.oldPrice ?? "–"})`);
      continue;
    }

    try {
      await postDeal(deal, config.campaign, config.tracking.telegram);
      deal.telegramPostedAt = new Date().toISOString();
      state.posted[asin] = deal.telegramPostedAt;
      const i = list.findIndex((d) => d.asin === asin);
      if (i >= 0) list.splice(i, 1);
      list.unshift(deal);
      posted++;
      console.log(`📥 Inbox gepostet: ${deal.title} (${asin})`);
      await reply(
        msg.chat.id,
        `✅ Gepostet: <b>${deal.title.replace(/</g, "&lt;")}</b>${deal.price ? ` – ${deal.price.toFixed(2).replace(".", ",")} €` : ""}\nhttps://www.amazon.de/dp/${asin}?tag=${config.tracking.telegram}`
      );
    } catch (e) {
      await reply(msg.chat.id, `❌ Posten fehlgeschlagen: ${e.message}`);
    }
  }
  return posted;
}

export { parseMessage };
