/**
 * Keepa Deals API – findet echte Preisstürze auf Amazon.de anhand des Preisverlaufs.
 * Doku: https://keepa.com/#!discuss/t/browsing-deals/338
 * Env: KEEPA_API_KEY
 */
import type { Deal } from "@/lib/deals";

export interface AutopilotConfig {
  enabled: boolean;
  /** Amazon-Browse-Node-IDs der Hauptkategorien (Amazon.de) */
  categories: number[];
  categoryNames: Record<string, string>;
  /** Mindest-Rabatt in % gegenüber dem 90-Tage-Durchschnitt */
  minDiscount: number;
  /** Mindestbewertung (z. B. 4.0) */
  minRating: number;
  /** Nur Produkte mit Verkaufsrang bis X (= gefragte Produkte) */
  maxSalesRank: number;
  minPrice: number;
  maxPrice: number;
  maxPerRun: number;
  maxPerDay: number;
  /** Keine Posts zwischen [von, bis) Uhr (Europe/Berlin) */
  quietHours: [number, number];
}

// Keepa-Preistypen (Index in current/avg)
const AMAZON = 0;
const RATING = 16;
const COUNT_REVIEWS = 17;
const SALES_RANK = 3;

interface KeepaDeal {
  asin: string;
  title?: string;
  image?: number[];
  rootCat?: number;
  categories?: number[];
  current?: number[];
  /** avg[interval][priceType], interval 0=Tag 1=Woche 2=Monat 3=90 Tage */
  avg?: number[][];
}

interface KeepaDealResponse {
  deals?: { dr?: KeepaDeal[] };
  tokensLeft?: number;
  error?: { type?: string; message?: string };
}

export interface KeepaResult {
  deals: Deal[];
  raw: number;
  tokensLeft?: number;
}

export function keepaConfigured(): boolean {
  return Boolean(process.env.KEEPA_API_KEY);
}

const cents = (v: number | undefined) => (v !== undefined && v > 0 ? v / 100 : undefined);

export async function fetchKeepaDeals(cfg: AutopilotConfig): Promise<KeepaResult> {
  const key = process.env.KEEPA_API_KEY;
  if (!key) throw new Error("KEEPA_API_KEY fehlt");

  const selection = {
    page: 0,
    domainId: 3, // Amazon.de
    priceTypes: [AMAZON], // von Amazon selbst verkauft → verlässlich & Prime
    includeCategories: cfg.categories,
    deltaPercentRange: [cfg.minDiscount, 95],
    currentRange: [Math.round(cfg.minPrice * 100), Math.round(cfg.maxPrice * 100)],
    salesRankRange: [1, cfg.maxSalesRank],
    minRating: Math.round(cfg.minRating * 10),
    dateRange: 3, // Vergleich mit 90-Tage-Durchschnitt
    isRangeEnabled: true,
    isFilterEnabled: true,
    filterErotic: true,
    hasReviews: true,
    isOutOfStock: false,
    sortType: 4, // nach Rabatt in %
  };

  const url = `https://api.keepa.com/deal?key=${encodeURIComponent(key)}&selection=${encodeURIComponent(
    JSON.stringify(selection)
  )}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json()) as KeepaDealResponse;
  if (!res.ok || json.error) {
    throw new Error(`Keepa: ${json.error?.message ?? json.error?.type ?? res.status}`);
  }

  const raw = json.deals?.dr ?? [];
  const now = new Date().toISOString();
  const deals: Deal[] = [];

  for (const k of raw) {
    const price = cents(k.current?.[AMAZON]);
    const avg90 = cents(k.avg?.[3]?.[AMAZON]);
    if (!k.asin || !k.title || !price || !avg90 || avg90 <= price) continue;

    const discount = Math.round((1 - price / avg90) * 100);
    const rating = (k.current?.[RATING] ?? 0) / 10;
    const reviews = k.current?.[COUNT_REVIEWS] ?? 0;
    const rank = k.current?.[SALES_RANK] ?? 0;

    // Zusätzliche Absicherung, falls Keepa-Filter großzügiger sind
    if (discount < cfg.minDiscount) continue;
    if (price < cfg.minPrice || price > cfg.maxPrice) continue;
    if (rating > 0 && rating < cfg.minRating) continue;
    if (rank > 0 && rank > cfg.maxSalesRank) continue;

    const imageName = k.image?.length ? String.fromCharCode(...k.image) : "";
    const cat = String(k.rootCat ?? k.categories?.[0] ?? "");

    deals.push({
      id: `auto-${k.asin.toLowerCase()}`,
      asin: k.asin,
      title: shortenTitle(k.title),
      subtitle:
        rating > 0
          ? `⭐ ${rating.toFixed(1).replace(".", ",")} (${reviews.toLocaleString("de-DE")} Bewertungen)`
          : undefined,
      category: cfg.categoryNames[cat] ?? "Tech",
      price,
      oldPrice: Math.round(avg90 * 100) / 100,
      oldPriceLabel: "Ø 90 Tage",
      image: imageName ? `https://m.media-amazon.com/images/I/${imageName}` : undefined,
      checkedAt: now,
      source: "auto",
    });
  }

  return { deals, raw: raw.length, tokensLeft: json.tokensLeft };
}

/** Amazon-Titel sind oft sehr lang – auf die ersten sinnvollen Wörter kürzen. */
export function shortenTitle(title: string, max = 70): string {
  const clean = title.replace(/\s+/g, " ").trim();
  const cut = clean.split(/\s[-–|,(]\s?/)[0];
  const base = cut.length >= 20 ? cut : clean;
  if (base.length <= max) return base;
  return base.slice(0, base.lastIndexOf(" ", max)).trim() + " …";
}
