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
import { categorize } from "@/scripts/categories.mjs";
import { rateDeal } from "@/scripts/rating.mjs";
import { enqueue, parseDeals, queueConfigured, queueSize, resolveAsin, type QueueItem } from "@/lib/inbox";

/**
 * Telegram-Webhook für die Deal-Inbox: Antwortet sofort, wenn du dem Bot
 * einen Amazon-Link schickst, und postet den Deal in den Kanal.
 * Env (Vercel): TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID, TELEGRAM_WEBHOOK_SECRET
 */
export const dynamic = "force-dynamic";

const OWNERS = ((data.telegram as { ownerIds?: string[] }).ownerIds ?? []).map(String);
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

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function caption(deal: Deal): string {
  const pct = discountPercent(deal);
  const save = savings(deal);
  return [
    `${(() => {
      const r = rateDeal(deal).key;
      return r === "hot" ? "🔥🔥🔥 <b>HOT DEAL</b>" : r === "good" ? "👍 <b>GUTER DEAL</b>" : "👌 <b>SOLIDER DEAL</b>";
    })()}${pct ? `  ·  <b>-${pct}%</b>` : ""}  ·  ${esc(campaign.name)}`,
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
  p.set("rate", rateDeal(deal).key);
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
      [
        "📥 <b>Deal-Inbox</b>",
        "",
        "<b>Ein Link</b> → wird sofort gepostet.",
        "<b>Mehrere Links</b> (einer pro Zeile) → kommen in die Warteschlange und werden nach und nach gepostet.",
        "",
        "<code>Anker Powerbank 20000 mAh\nhttps://amzn.to/… 29,99€ statt 49,99€\nhttps://amzn.to/… 14,99€</code>",
        "",
        "/warteschlange – wie viele Deals noch warten",
      ].join("\n")
    );
    return Response.json({ ok: true });
  }

  if (text === "/warteschlange" || text === "/queue") {
    const n = queueConfigured() ? await queueSize() : null;
    await reply(msg.chat.id, n === null ? "⚠️ Warteschlange nicht erreichbar." : `📋 ${n} Deal(s) in der Warteschlange.`);
    return Response.json({ ok: true });
  }

  const parsed = parseDeals(text);
  if (!parsed.length) {
    await reply(msg.chat.id, "❓ Ich habe keinen Amazon-Link gefunden.");
    return Response.json({ ok: true });
  }

  // ASINs auflösen (parallel, Kurzlinks nur per Redirect-Header)
  const resolved = await Promise.all(parsed.map((p) => resolveAsin(p.url).catch(() => null)));
  const items: QueueItem[] = [];
  const failed: string[] = [];
  parsed.forEach((p, i) => {
    const r = resolved[i];
    if (!r) return failed.push(p.url);
    if (items.some((x) => x.asin === r.asin)) return;
    items.push({
      asin: r.asin,
      title: p.title ?? r.slugTitle ?? "Amazon-Deal",
      price: p.price,
      oldPrice: p.oldPrice,
      addedAt: new Date(msg.date * 1000).toISOString(),
    });
  });
  const failNote = failed.length ? `\n⚠️ ${failed.length} Link(s) ohne erkennbare ASIN übersprungen.` : "";

  if (!items.length) {
    await reply(msg.chat.id, "❌ Konnte aus den Links keine Amazon-Produkt-ID (ASIN) lesen.");
    return Response.json({ ok: true });
  }

  // Mehrere Deals → Warteschlange
  if (items.length > 1) {
    if (!queueConfigured()) {
      await reply(msg.chat.id, "⚠️ Warteschlange ist noch nicht eingerichtet (GITHUB_QUEUE_TOKEN fehlt in Vercel).");
      return Response.json({ ok: true });
    }
    try {
      await enqueue(items);
      const list = items
        .slice(0, 10)
        .map((x, i) => `${i + 1}. ${esc(x.title)}${x.price ? ` – ${formatPrice(x.price)}` : ""}`)
        .join("\n");
      await reply(
        msg.chat.id,
        `📥 <b>${items.length} Deals in der Warteschlange</b>\n${list}${items.length > 10 ? "\n…" : ""}\n\nIch poste sie nach und nach (ca. alle 15 Min, nachts Pause).${failNote}`
      );
    } catch (e) {
      await reply(msg.chat.id, `❌ Warteschlange fehlgeschlagen: ${esc((e as Error).message)}`);
    }
    return Response.json({ ok: true });
  }

  // Ein Deal → sofort posten
  const it = items[0];
  const deal: Deal = {
    id: `inbox-${it.asin.toLowerCase()}`,
    asin: it.asin,
    title: it.title,
    category: categorize(it.title),
    price: it.price,
    oldPrice: it.oldPrice,
    checkedAt: it.addedAt,
    source: "auto",
  };
  try {
    await postToChannel(deal);
    await reply(
      msg.chat.id,
      `✅ Gepostet: <b>${esc(deal.title)}</b>${deal.price ? ` – ${formatPrice(deal.price)}` : ""}\n${affiliateUrl(it.asin, "telegram")}${failNote}`
    );
  } catch (e) {
    await reply(msg.chat.id, `❌ Posten fehlgeschlagen: ${esc((e as Error).message)}`);
  }
  return Response.json({ ok: true });
}
