/**
 * Telegram-Posting für Deals.
 *
 * Benötigt in .env.local (wird nicht committet):
 *   TELEGRAM_BOT_TOKEN=123456:ABC...      (von @BotFather)
 *   TELEGRAM_CHANNEL_ID=@deinkanal        (oder numerische ID -100...)
 */
import path from "node:path";
import { rateDeal } from "./rating.mjs";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_BASE_URL = "https://gentlelink.berkcanatesoglu.de";
const DISCLOSURE = "Als Amazon-Partner verdiene ich an qualifizierten Verkäufen.";

try {
  process.loadEnvFile(path.join(ROOT, ".env.local"));
} catch {
  /* keine .env.local – dann nur echte Umgebungsvariablen */
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const eur = (n) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const stamp = (iso) =>
  new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);
}

function ratingLine(deal, campaign, pct) {
  const r = rateDeal(deal);
  const head = r.key === "hot" ? "🔥🔥🔥 <b>HOT DEAL</b>" : r.key === "good" ? "👍 <b>GUTER DEAL</b>" : "👌 <b>SOLIDER DEAL</b>";
  return `${head}${pct ? `  ·  <b>-${pct}%</b>` : ""}  ·  ${esc(campaign.name)}`;
}

export function buildMessage(deal, campaign) {
  const pct =
    deal.price && deal.oldPrice && deal.oldPrice > deal.price
      ? Math.round((1 - deal.price / deal.oldPrice) * 100)
      : null;

  const lines = [
    ratingLine(deal, campaign, pct),
    "",
    `<b>${esc(deal.title)}</b>`,
    deal.subtitle ? esc(deal.subtitle) : null,
    "",
    deal.price
      ? `💶 <b>${eur(deal.price)}</b>${
          deal.oldPrice && deal.oldPrice > deal.price
            ? deal.oldPriceLabel
              ? ` <i>(${esc(deal.oldPriceLabel)}: ${eur(deal.oldPrice)})</i>`
              : ` statt <s>${eur(deal.oldPrice)}</s>`
            : ""
        }`
      : "💶 Preis auf Amazon ansehen",
    deal.price && deal.oldPrice && deal.oldPrice > deal.price
      ? `💰 <b>Du sparst ${eur(Math.round((deal.oldPrice - deal.price) * 100) / 100)}</b>`
      : null,
    `<i>Stand ${stamp(deal.checkedAt)} Uhr – Preis kann sich jederzeit ändern.</i>`,
    "",
    `#${String(deal.category ?? "Deal").replace(/[^\p{L}\p{N}]/gu, "")} · #Anzeige · ${esc(DISCLOSURE)}`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

/** Deal-Grafik (Produktbild + Preis + Ersparnis), gerendert auf Vercel. */
export function cardUrl(deal) {
  const p = new URLSearchParams({ asin: deal.asin, title: deal.title, ts: deal.checkedAt });
  if (deal.price) p.set("price", String(deal.price));
  if (deal.oldPrice) p.set("old", String(deal.oldPrice));
  if (deal.oldPriceLabel) p.set("ref", deal.oldPriceLabel);
  p.set("rate", rateDeal(deal).key);
  if (deal.image) p.set("img", deal.image);
  return `${PUBLIC_BASE_URL}/api/deal-card?${p.toString()}`;
}

/** Öffentlicher Kanal-Link (data/deals.json → telegram.channelUrl) für den Teilen-Button. */
let channelUrlCache;
async function channelUrl() {
  if (channelUrlCache !== undefined) return channelUrlCache;
  try {
    const { readFile } = await import("node:fs/promises");
    const cfg = JSON.parse(await readFile(path.join(ROOT, "data", "deals.json"), "utf8"));
    channelUrlCache = cfg.telegram?.channelUrl ?? "";
  } catch {
    channelUrlCache = "";
  }
  return channelUrlCache;
}

export async function shareButton() {
  const url = await channelUrl();
  if (!url) return null;
  const text = "🔥 Tägliche Tech-Deals von Amazon – hier bekommst du sie sofort aufs Handy:";
  return {
    text: "📤 Kanal mit Freunden teilen",
    url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  };
}

export async function telegramApi(method, body) {
  if (!telegramConfigured()) throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID fehlen");
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHANNEL_ID, ...body }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description ?? res.status}`);
  return json.result;
}

export async function postDeal(deal, campaign, tag) {
  if (!tag) throw new Error("Tracking-ID für Telegram fehlt (data/deals.json → tracking.telegram)");
  const text = buildMessage(deal, campaign);
  const share = await shareButton();
  const reply_markup = {
    inline_keyboard: [
      [{ text: "🛒 Zum Deal auf Amazon", url: `https://www.amazon.de/dp/${deal.asin}?tag=${tag}` }],
      [
        {
          text: "🔥 Alle Deals",
          url: `${PUBLIC_BASE_URL}/deals?utm_source=telegram&utm_medium=channel&utm_campaign=${campaign.slug}`,
        },
        ...(share ? [share] : []),
      ],
    ],
  };
  const common = { parse_mode: "HTML", reply_markup };
  try {
    return await telegramApi("sendPhoto", { ...common, photo: cardUrl(deal), caption: text });
  } catch (e) {
    // Grafik nicht abrufbar → als Textnachricht nachschieben
    console.warn(`⚠️  Bild fehlgeschlagen (${e.message}) – sende Text`);
    return telegramApi("sendMessage", { ...common, text, link_preview_options: { is_disabled: true } });
  }
}
