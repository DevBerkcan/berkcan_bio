import data from "@/data/deals.json";

export type Channel = "web" | "instagram" | "telegram";

/** Amazon-Tracking-IDs pro Kanal (in data/deals.json pflegen). */
export const TRACKING_IDS: Record<Channel, string> = {
  web: data.tracking.web,
  instagram: data.tracking.instagram,
  telegram: data.tracking.telegram,
};

/** Standard-Store-ID – für Links ohne bekannten Kanal. */
export const AFFILIATE_TAG = TRACKING_IDS.web;

/** Kanal aus utm_source ermitteln (Story-Link → instagram, Telegram-Button → telegram). */
export function channelFromSource(source: string | null | undefined): Channel {
  const s = (source ?? "").toLowerCase();
  if (s === "ig" || s === "instagram") return "instagram";
  if (s === "telegram" || s === "tg") return "telegram";
  return "web";
}

/** Öffentliche Domain der Link-in-Bio-Seite (für Story-Links mit UTM). */
export const PUBLIC_BASE_URL = "https://gentlelink.berkcanatesoglu.de";

/**
 * Öffentlicher Link zum Telegram-Deal-Kanal (data/deals.json → telegram.channelUrl).
 * Leer = kein Telegram-Button.
 */
export const TELEGRAM_CHANNEL_URL: string = data.telegram?.channelUrl ?? "";

/** Pflichthinweis laut Amazon-Partnerprogramm (Operating Agreement). */
export const AMAZON_DISCLOSURE =
  "Als Amazon-Partner verdiene ich an qualifizierten Verkäufen.";

/** Amazon erlaubt angezeigte Preise nur, wenn sie höchstens 24 h alt sind. */
const PRICE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface Deal {
  id: string;
  asin: string;
  title: string;
  subtitle?: string;
  category: string;
  price?: number;
  oldPrice?: number;
  /** Bild-URL aus Amazon SiteStripe oder eigenes Bild unter /public/deals */
  image?: string;
  /** Zeitpunkt, an dem der Preis zuletzt auf Amazon geprüft wurde (ISO) */
  checkedAt: string;
  featured?: boolean;
  /** Entwürfe sind nur lokal (npm run dev) sichtbar */
  draft?: boolean;
  /** Wann der Deal in den Telegram-Kanal gepostet wurde (vom Skript gesetzt) */
  telegramPostedAt?: string;
  /** Beschriftung des Vergleichspreises, z. B. "Ø 90 Tage" (Standard: "statt") */
  oldPriceLabel?: string;
  /** manual = von Hand / Skript, auto = vom Autopiloten gefunden */
  source?: "manual" | "auto";
}

export interface Campaign {
  name: string;
  slug: string;
  endsAt: string;
}

export const campaign: Campaign = data.campaign;

const allDeals = data.deals as Deal[];

/** Nur die von Hand gepflegten Deals aus data/deals.json (für Autopilot: lib/deals-server.ts). */
export function getDeals(): Deal[] {
  const showDrafts = process.env.NODE_ENV !== "production";
  return allDeals
    .filter((d) => showDrafts || !d.draft)
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
}

export function getDeal(id: string): Deal | undefined {
  return getDeals().find((d) => d.id === id);
}

export function affiliateUrl(asin: string, channel: Channel = "web"): string {
  return `https://www.amazon.de/dp/${encodeURIComponent(asin)}?tag=${TRACKING_IDS[channel]}`;
}

/**
 * Hauptbild des Produkts direkt vom Amazon-Bild-CDN (per ASIN, wird nur verlinkt,
 * nicht gespeichert). Wird genutzt, wenn kein eigenes Bild (image) hinterlegt ist.
 */
export function amazonImageUrl(asin: string, size = 500): string {
  return `https://m.media-amazon.com/images/P/${encodeURIComponent(asin)}.01._SCLZZZZZZZ_SX${size}_.jpg`;
}

export function productImage(deal: Deal): string {
  return deal.image || amazonImageUrl(deal.asin);
}

/** Ersparnis in Euro (oder null, wenn kein Streichpreis). */
export function savings(deal: Pick<Deal, "price" | "oldPrice">): number | null {
  if (!deal.price || !deal.oldPrice || deal.oldPrice <= deal.price) return null;
  return Math.round((deal.oldPrice - deal.price) * 100) / 100;
}

export function discountPercent(deal: Deal): number | null {
  if (!deal.price || !deal.oldPrice || deal.oldPrice <= deal.price) return null;
  return Math.round((1 - deal.price / deal.oldPrice) * 100);
}

/** true, wenn der Preis angezeigt werden darf (geprüft innerhalb der letzten 24 h). */
export function isPriceFresh(deal: Deal, now: number = Date.now()): boolean {
  if (!deal.price) return false;
  const checked = new Date(deal.checkedAt).getTime();
  return Number.isFinite(checked) && now - checked <= PRICE_MAX_AGE_MS;
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function formatCheckedAt(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}

/** Link für den Instagram-Story-Sticker – landet direkt beim Deal. */
export function storyLink(deal: Deal): string {
  const params = new URLSearchParams({
    utm_source: "ig",
    utm_medium: "story",
    utm_campaign: campaign.slug,
    utm_content: deal.id,
  });
  return `${PUBLIC_BASE_URL}/deals?${params.toString()}#${deal.id}`;
}

export function caption(deal: Deal): string {
  const pct = discountPercent(deal);
  const lines = [
    `🔥 ${campaign.name.toUpperCase()} DEAL`,
    "",
    deal.title,
    deal.price
      ? `👉 ${formatPrice(deal.price)}${deal.oldPrice ? ` ${deal.oldPriceLabel ? `(${deal.oldPriceLabel}: ${formatPrice(deal.oldPrice)})` : `statt ${formatPrice(deal.oldPrice)}`}` : ""}${pct ? ` -${pct}%` : ""}`
      : "",
    savings(deal) ? `💰 Du sparst ${formatPrice(savings(deal)!)}` : "",
    `Preis Stand ${formatCheckedAt(deal.checkedAt)} Uhr – kann sich jederzeit ändern.`,
    "",
    "🔗 Link in Bio → Black Friday Deals",
    "",
    `#Anzeige | ${AMAZON_DISCLOSURE}`,
    "#blackfriday #deals #techdeals #angebote #setup",
  ];
  return lines.filter((l, i) => l !== "" || lines[i - 1] !== "").join("\n");
}
