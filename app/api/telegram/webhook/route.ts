import data from "@/data/deals.json";
import {
  AMAZON_DISCLOSURE,
  PUBLIC_BASE_URL,
  TELEGRAM_CHANNEL_URL,
  affiliateUrl,
  campaign,
  discountPercent,
  formatCheckedAt,
  formatPrice,
  savings,
  type Deal,
} from "@/lib/deals";

/**
 * Telegram-Webhook für die Deal-Inbox: Antwortet sofort, wenn du dem Bot
 * einen Amazon-Link schickst, und postet den Deal in den Kanal.
 * Env (Vercel): TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID, TELEGRAM_WEBHOOK_SECRET
 */
export const dynamic = "force-dynamic";

const OWNERS = ((data.telegram as { ownerIds?: string[] }).ownerIds ?? []).map(String);
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const ASIN_RE = /\/(?:dp|gp\/product|gp\/aw\/d|d)\/([A-Z0-9]{10})(?=[/?#]|$)/i;
const PRICE = String.raw`(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)`;
const PRICE_RE = new RegExp(`${PRICE}\\s*(?:€|EUR|Euro)`, "gi");
const REF_RE = new RegExp(
  `(?:statt|UVP|VGP|PVG|Vergleichspreis|zuvor|sonst|vorher)\\s*:?\\s*(?:ca\\.\\s*)?${PRICE}\\s*(?:€|EUR|Euro)?`,
  "i"
);

async function tg(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json()) as { ok: boolean; description?: string; result?: unknown };
  if (!json.ok) throw new Error(`${method}: ${json.description}`);
  return json.result;
}

const reply = (chat_id: number, text: string) =>
  tg("sendMessage", { chat_id, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }).catch(
    () => null
  );

function euro(s: string): number | undefined {
  const n = Number(s.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

async function resolveAsin(url: string): Promise<string | null> {
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    const m = current.match(ASIN_RE);
    if (m && /amazon\./i.test(current)) return m[1].toUpperCase();
    // Kurzlink (amzn.to / amzn.eu): nur Redirect-Header lesen
    const res = await fetch(current, { method: "HEAD", redirect: "manual", headers: { "User-Agent": UA } });
    const loc = res.headers.get("location");
    if (!loc) break;
    current = new URL(loc, current).toString();
  }
  return null;
}

function parse(text: string) {
  const url = (text.match(/https?:\/\/\S+/g) ?? []).find((u) => /amazon\.|amzn\.to|amzn\.eu|a\.co\//i.test(u));
  const ref = text.match(REF_RE);
  const oldPrice = ref ? euro(ref[1]) : undefined;
  const rest = ref ? text.replace(ref[0], " ") : text;
  const price = [...rest.matchAll(PRICE_RE)].map((m) => euro(m[1])).find(Boolean);
  const title = text
    .split("\n")
    .map((l) =>
      l
        .replace(/https?:\/\/\S+/g, "")
        .replace(new RegExp(REF_RE.source, "gi"), "")
        .replace(PRICE_RE, "")
        .replace(/\(\s*\)|\[\s*\]/g, "")
        .replace(/\s+(?:für|ab|nur|um|zum|statt)\s*$/i, "")
        .replace(/[\p{Extended_Pictographic}️]/gu, "")
        .replace(/\s{2,}/g, " ")
        .replace(/[|•\-–:]+\s*$/g, "")
        .trim()
    )
    .find((l) => l.length >= 4);
  return {
    url: url?.replace(/[),.]+$/, ""),
    price,
    oldPrice: oldPrice && price && oldPrice > price ? oldPrice : undefined,
    title: title && title.length > 70 ? `${title.slice(0, title.lastIndexOf(" ", 70))} …` : title,
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function caption(deal: Deal): string {
  const pct = discountPercent(deal);
  const save = savings(deal);
  return [
    `🔥 <b>${esc(campaign.name)} Deal</b>${pct ? `  ·  <b>-${pct}%</b>` : ""}`,
    "",
    `<b>${esc(deal.title)}</b>`,
    "",
    deal.price
      ? `💶 <b>${formatPrice(deal.price)}</b>${save && deal.oldPrice ? ` statt <s>${formatPrice(deal.oldPrice)}</s>` : ""}`
      : "💶 Preis auf Amazon ansehen",
    save ? `💰 <b>Du sparst ${formatPrice(save)}</b>` : null,
    `<i>Stand ${formatCheckedAt(deal.checkedAt)} Uhr – Preis kann sich jederzeit ändern.</i>`,
    "",
    `#Deal · #Anzeige · ${esc(AMAZON_DISCLOSURE)}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

function cardUrl(deal: Deal): string {
  const p = new URLSearchParams({ asin: deal.asin, title: deal.title, ts: deal.checkedAt });
  if (deal.price) p.set("price", String(deal.price));
  if (deal.oldPrice) p.set("old", String(deal.oldPrice));
  return `${PUBLIC_BASE_URL}/api/deal-card?${p.toString()}`;
}

async function postToChannel(deal: Deal) {
  const shareText = "🔥 Tägliche Tech-Deals von Amazon – hier bekommst du sie sofort aufs Handy:";
  const reply_markup = {
    inline_keyboard: [
      [{ text: "🛒 Zum Deal auf Amazon", url: affiliateUrl(deal.asin, "telegram") }],
      [
        { text: "🔥 Alle Deals", url: `${PUBLIC_BASE_URL}/deals?utm_source=telegram&utm_medium=channel&utm_campaign=${campaign.slug}` },
        ...(TELEGRAM_CHANNEL_URL
          ? [
              {
                text: "📤 Kanal mit Freunden teilen",
                url: `https://t.me/share/url?url=${encodeURIComponent(TELEGRAM_CHANNEL_URL)}&text=${encodeURIComponent(shareText)}`,
              },
            ]
          : []),
      ],
    ],
  };
  const common = { chat_id: process.env.TELEGRAM_CHANNEL_ID, parse_mode: "HTML", reply_markup };
  try {
    await tg("sendPhoto", { ...common, photo: cardUrl(deal), caption: caption(deal) });
  } catch {
    await tg("sendMessage", { ...common, text: caption(deal), link_preview_options: { is_disabled: true } });
  }
}

interface Update {
  message?: { chat: { id: number; type: string }; from?: { id: number }; text?: string; caption?: string; date: number };
}

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response("unauthorized", { status: 401 });
  }
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHANNEL_ID) {
    return new Response("not configured", { status: 503 });
  }

  const update = (await req.json()) as Update;
  const msg = update.message;
  if (!msg || msg.chat.type !== "private") return Response.json({ ok: true });

  const from = String(msg.from?.id ?? "");
  const text = (msg.text ?? msg.caption ?? "").trim();

  if (!OWNERS.includes(from)) {
    await reply(msg.chat.id, `👋 Deine Telegram-ID ist <code>${from}</code>. Dieser Bot nimmt nur Deals vom Kanal-Betreiber an.`);
    return Response.json({ ok: true });
  }

  if (!text || text === "/start" || text === "/hilfe") {
    await reply(
      msg.chat.id,
      "📥 <b>Deal-Inbox</b>\nSchick mir einen Amazon-Link, gern mit Titel und Preis:\n\n<code>Anker Powerbank 20000 mAh\nhttps://amzn.to/… 29,99€ statt 49,99€</code>\n\nIch poste ihn sofort mit deinem Partnerlink."
    );
    return Response.json({ ok: true });
  }

  const p = parse(text);
  if (!p.url) {
    await reply(msg.chat.id, "❓ Ich habe keinen Amazon-Link gefunden.");
    return Response.json({ ok: true });
  }

  const asin = await resolveAsin(p.url).catch(() => null);
  if (!asin) {
    await reply(msg.chat.id, "❌ Konnte aus dem Link keine Amazon-Produkt-ID (ASIN) lesen.");
    return Response.json({ ok: true });
  }

  const deal: Deal = {
    id: `inbox-${asin.toLowerCase()}`,
    asin,
    title: p.title ?? "Amazon-Deal",
    category: "Deal",
    price: p.price,
    oldPrice: p.oldPrice,
    checkedAt: new Date(msg.date * 1000).toISOString(),
    source: "auto",
  };

  try {
    await postToChannel(deal);
    await reply(
      msg.chat.id,
      `✅ Gepostet: <b>${esc(deal.title)}</b>${deal.price ? ` – ${formatPrice(deal.price)}` : ""}\n${affiliateUrl(asin, "telegram")}`
    );
  } catch (e) {
    await reply(msg.chat.id, `❌ Posten fehlgeschlagen: ${esc((e as Error).message)}`);
  }
  return Response.json({ ok: true });
}
