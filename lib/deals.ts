import data from "@/data/deals.json";

/** Amazon PartnerNet Store-ID – wird an jeden Produktlink angehängt. */
export const AFFILIATE_TAG = "berkcanat-21";

/** Öffentliche Domain der Link-in-Bio-Seite (für Story-Links mit UTM). */
export const PUBLIC_BASE_URL = "https://gentlelink.berkcanatesoglu.de";

/**
 * Öffentlicher Link zum Telegram-Deal-Kanal, z. B. "https://t.me/berkcandeals".
 * Leer = kein Telegram-Button auf der Deal-Seite.
 */
export const TELEGRAM_CHANNEL_URL = "https://t.me/+68M0ZAE8bnsyOTY6";

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
}

export interface Campaign {
  name: string;
  slug: string;
  endsAt: string;
}

export const campaign: Campaign = data.campaign;

const allDeals = data.deals as Deal[];

export function getDeals(): Deal[] {
  const showDrafts = process.env.NODE_ENV !== "production";
  return allDeals
    .filter((d) => showDrafts || !d.draft)
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
}

export function getDeal(id: string): Deal | undefined {
  return getDeals().find((d) => d.id === id);
}

export function affiliateUrl(asin: string): string {
  return `https://www.amazon.de/dp/${encodeURIComponent(asin)}?tag=${AFFILIATE_TAG}`;
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
      ? `👉 ${formatPrice(deal.price)}${deal.oldPrice ? ` statt ${formatPrice(deal.oldPrice)}` : ""}${pct ? ` (-${pct}%)` : ""}`
      : "",
    `Preis Stand ${formatCheckedAt(deal.checkedAt)} Uhr – kann sich jederzeit ändern.`,
    "",
    "🔗 Link in Bio → Black Friday Deals",
    "",
    `#Anzeige | ${AMAZON_DISCLOSURE}`,
    "#blackfriday #deals #techdeals #angebote #setup",
  ];
  return lines.filter((l, i) => l !== "" || lines[i - 1] !== "").join("\n");
}
