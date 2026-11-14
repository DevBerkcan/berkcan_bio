/**
 * Telegram-Posting serverseitig (Autopilot). Gleiches Format wie scripts/telegram.mjs.
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID
 */
import {
  AMAZON_DISCLOSURE,
  PUBLIC_BASE_URL,
  affiliateUrl,
  campaign,
  discountPercent,
  formatCheckedAt,
  formatPrice,
  savings,
  type Deal,
} from "@/lib/deals";

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildMessage(deal: Deal): string {
  const pct = discountPercent(deal);
  const save = savings(deal);
  const ref =
    deal.oldPrice && deal.price && deal.oldPrice > deal.price
      ? deal.oldPriceLabel
        ? ` <i>(${esc(deal.oldPriceLabel)}: ${formatPrice(deal.oldPrice)})</i>`
        : ` statt <s>${formatPrice(deal.oldPrice)}</s>`
      : "";
  const lines = [
    `🔥 <b>${esc(campaign.name)} Deal</b>${pct ? `  ·  <b>-${pct}%</b>` : ""}`,
    "",
    `<b>${esc(deal.title)}</b>`,
    deal.subtitle ? esc(deal.subtitle) : null,
    "",
    deal.price ? `💶 <b>${formatPrice(deal.price)}</b>${ref}` : "💶 Preis auf Amazon ansehen",
    save ? `💰 <b>Du sparst ${formatPrice(save)}</b>${deal.oldPriceLabel ? " ggü. Durchschnittspreis" : ""}` : null,
    `<i>Stand ${formatCheckedAt(deal.checkedAt)} Uhr – Preis kann sich jederzeit ändern.</i>`,
    "",
    `#Anzeige · ${esc(AMAZON_DISCLOSURE)}`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

export function cardUrl(deal: Deal): string {
  const p = new URLSearchParams({ asin: deal.asin, title: deal.title, ts: deal.checkedAt });
  if (deal.price) p.set("price", String(deal.price));
  if (deal.oldPrice) p.set("old", String(deal.oldPrice));
  if (deal.oldPriceLabel) p.set("ref", deal.oldPriceLabel);
  if (deal.image) p.set("img", deal.image);
  return `${PUBLIC_BASE_URL}/api/deal-card?${p.toString()}`;
}

async function call(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return (await res.json()) as { ok: boolean; description?: string; result?: { message_id: number } };
}

export async function postDealToTelegram(deal: Deal): Promise<number> {
  if (!telegramConfigured()) throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID fehlen");
  const text = buildMessage(deal);
  const common = {
    chat_id: process.env.TELEGRAM_CHANNEL_ID,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🛒 Zum Deal auf Amazon", url: affiliateUrl(deal.asin, "telegram") }],
        [
          {
            text: "🔥 Alle Black-Friday-Deals",
            url: `${PUBLIC_BASE_URL}/deals?utm_source=telegram&utm_medium=channel&utm_campaign=${campaign.slug}`,
          },
        ],
      ],
    },
  };

  let json = await call("sendPhoto", { ...common, photo: cardUrl(deal), caption: text });
  if (!json.ok) {
    console.warn(`[telegram] Bild fehlgeschlagen (${json.description}) – sende Text`);
    json = await call("sendMessage", { ...common, text, link_preview_options: { is_disabled: true } });
  }
  if (!json.ok || !json.result) throw new Error(`Telegram: ${json.description}`);
  return json.result.message_id;
}
