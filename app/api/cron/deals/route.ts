import { revalidatePath } from "next/cache";
import data from "@/data/deals.json";
import { discountPercent, type Deal } from "@/lib/deals";
import { getAutoDeals, saveAutoDeals } from "@/lib/deals-server";
import { fetchKeepaDeals, keepaConfigured, type AutopilotConfig } from "@/lib/keepa";
import { exists, getNumber, incr, setOnce, storeConfigured } from "@/lib/store";
import { postDealToTelegram, telegramConfigured } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const cfg = data.autopilot as unknown as AutopilotConfig;
const REPOST_AFTER_S = 7 * 24 * 3600; // dasselbe Produkt frühestens nach 7 Tagen erneut
const MAX_LIST = 60;

function berlin(now = new Date()) {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24 };
}

function isQuiet(hour: number): boolean {
  const [from, to] = cfg.quietHours;
  return from > to ? hour >= from || hour < to : hour >= from && hour < to;
}

/**
 * Autopilot: holt neue Deals von Keepa, postet sie in Telegram und zeigt sie auf /deals.
 * Aufruf alle 30 Min durch GitHub Actions (.github/workflows/deal-autopilot.yml).
 *   Authorization: Bearer <CRON_SECRET>      ?dry=1 → nur anzeigen, nichts posten
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const dry = url.searchParams.get("dry") === "1";
  const missing = [
    !keepaConfigured() && "KEEPA_API_KEY",
    !storeConfigured() && "KV_REST_API_URL/KV_REST_API_TOKEN",
    !telegramConfigured() && "TELEGRAM_BOT_TOKEN/TELEGRAM_CHANNEL_ID",
  ].filter(Boolean);

  if (!cfg.enabled) return Response.json({ status: "disabled" });
  if (missing.length && !(dry && keepaConfigured())) {
    return Response.json({ status: "not_configured", missing }, { status: 503 });
  }

  const { day, hour } = berlin();
  const result = await fetchKeepaDeals(cfg);
  const candidates = [...result.deals].sort(
    (a, b) => (discountPercent(b) ?? 0) - (discountPercent(a) ?? 0)
  );

  if (dry) {
    return Response.json({
      status: "dry_run",
      keepaRaw: result.raw,
      tokensLeft: result.tokensLeft,
      candidates: candidates.slice(0, 15).map((d) => ({
        asin: d.asin,
        title: d.title,
        price: d.price,
        avg90: d.oldPrice,
        discount: discountPercent(d),
        category: d.category,
      })),
    });
  }

  // Bereits gelistete Auto-Deals mit frischem Preis aktualisieren (ohne neu zu posten)
  const fresh = new Map(candidates.map((d) => [d.asin, d]));
  const list: Deal[] = (await getAutoDeals()).map((d) => {
    const u = fresh.get(d.asin);
    return u ? { ...d, price: u.price, oldPrice: u.oldPrice, checkedAt: u.checkedAt } : d;
  });

  const posted: string[] = [];
  const errors: string[] = [];
  const countKey = `autopilot:count:${day}`;
  let budget = isQuiet(hour)
    ? 0
    : Math.min(cfg.maxPerRun, Math.max(0, cfg.maxPerDay - (await getNumber(countKey))));

  for (const deal of candidates) {
    if (budget <= 0) break;
    if (list.some((d) => d.asin === deal.asin)) continue;
    if (await exists(`autopilot:posted:${deal.asin}`)) continue;
    try {
      const messageId = await postDealToTelegram(deal);
      await setOnce(`autopilot:posted:${deal.asin}`, REPOST_AFTER_S);
      await incr(countKey, 48 * 3600);
      list.unshift({ ...deal, telegramPostedAt: new Date().toISOString() });
      posted.push(`${deal.asin} (#${messageId})`);
      budget--;
    } catch (e) {
      errors.push(`${deal.asin}: ${(e as Error).message}`);
    }
  }

  await saveAutoDeals(list.slice(0, MAX_LIST));
  revalidatePath("/deals");

  return Response.json({
    status: "ok",
    quiet: isQuiet(hour),
    keepaRaw: result.raw,
    candidates: candidates.length,
    posted,
    listed: Math.min(list.length, MAX_LIST),
    tokensLeft: result.tokensLeft,
    errors,
  });
}
