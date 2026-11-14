/**
 * Telegram-Posting für Deals.
 *
 * Benötigt in .env.local (wird nicht committet):
 *   TELEGRAM_BOT_TOKEN=123456:ABC...      (von @BotFather)
 *   TELEGRAM_CHANNEL_ID=@deinkanal        (oder numerische ID -100...)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TAG = "berkcanat-21";
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

export function buildMessage(deal, campaign) {
  const pct =
    deal.price && deal.oldPrice && deal.oldPrice > deal.price
      ? Math.round((1 - deal.price / deal.oldPrice) * 100)
      : null;

  const lines = [
    `🔥 <b>${esc(campaign.name)} Deal</b>${pct ? `  ·  <b>-${pct}%</b>` : ""}`,
    "",
    `<b>${esc(deal.title)}</b>`,
    deal.subtitle ? esc(deal.subtitle) : null,
    "",
    deal.price
      ? `💶 <b>${eur(deal.price)}</b>${deal.oldPrice && deal.oldPrice > deal.price ? ` statt <s>${eur(deal.oldPrice)}</s>` : ""}`
      : "💶 Preis auf Amazon ansehen",
    deal.price && deal.oldPrice && deal.oldPrice > deal.price
      ? `💰 <b>Du sparst ${eur(Math.round((deal.oldPrice - deal.price) * 100) / 100)}</b>`
      : null,
    `<i>Stand ${stamp(deal.checkedAt)} Uhr – Preis kann sich jederzeit ändern.</i>`,
    "",
    `#Anzeige · ${esc(DISCLOSURE)}`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

/** Deal-Grafik (Produktbild + Preis + Ersparnis), gerendert auf Vercel. */
export function cardUrl(deal) {
  const p = new URLSearchParams({ asin: deal.asin, title: deal.title, ts: deal.checkedAt });
  if (deal.price) p.set("price", String(deal.price));
  if (deal.oldPrice) p.set("old", String(deal.oldPrice));
  if (deal.image) p.set("img", deal.image);
  return `${PUBLIC_BASE_URL}/api/deal-card?${p.toString()}`;
}

export async function postDeal(deal, campaign) {
  if (!telegramConfigured()) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN und TELEGRAM_CHANNEL_ID fehlen in .env.local – siehe .env.example"
    );
  }
  const api = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
  const text = buildMessage(deal, campaign);
  const reply_markup = {
    inline_keyboard: [
      [{ text: "🛒 Zum Deal auf Amazon", url: `https://www.amazon.de/dp/${deal.asin}?tag=${TAG}` }],
      [
        {
          text: "🔥 Alle Black-Friday-Deals",
          url: `${PUBLIC_BASE_URL}/deals?utm_source=telegram&utm_medium=channel&utm_campaign=${campaign.slug}`,
        },
      ],
    ],
  };

  const common = { chat_id: process.env.TELEGRAM_CHANNEL_ID, parse_mode: "HTML", reply_markup };
  const method = "sendPhoto";
  const body = { ...common, photo: cardUrl(deal), caption: text };

  let res = await fetch(`${api}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let json = await res.json();

  // Grafik nicht abrufbar → als Textnachricht nachschieben
  if (!json.ok) {
    console.warn(`⚠️  Bild fehlgeschlagen (${json.description}) – sende Text`);
    res = await fetch(`${api}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...common, text, link_preview_options: { is_disabled: true } }),
    });
    json = await res.json();
  }

  if (!json.ok) throw new Error(`Telegram: ${json.description ?? res.status}`);
  return json.result;
}
