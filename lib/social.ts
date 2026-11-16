/**
 * Social-Studio: Auswahl der Deals und Texte für Instagram-Posts, Storys und Werbeanzeigen.
 * Nur serverseitig verwenden.
 */
import { AMAZON_DISCLOSURE, PUBLIC_BASE_URL, TELEGRAM_CHANNEL_URL, campaign, formatPrice, isPriceFresh, savings, type Deal } from "@/lib/deals";
import { getAllDeals } from "@/lib/deals-server";
import { CATEGORIES, categorize } from "@/scripts/categories.mjs";
import { dealScore, discountOf, rateDeal, temperatureFromSubtitle } from "@/scripts/rating.mjs";

export type SocialSet = "top" | "unter50";

export interface SocialDeal extends Deal {
  category: string;
  rating: "hot" | "good" | "ok";
  discount: number;
  save: number | null;
  score: number;
}

function enrich(d: Deal): SocialDeal {
  const r = { price: d.price, oldPrice: d.oldPrice, temperature: d.temperature ?? temperatureFromSubtitle(d.subtitle) };
  return {
    ...d,
    category: categorize(d.title, "", d.category),
    rating: rateDeal(r).key as SocialDeal["rating"],
    discount: discountOf(r),
    save: savings(d),
    score: dealScore(r),
  };
}

/** Beste aktuelle Deals (frischer Preis), optional nach Set/Kategorie gefiltert. */
export async function pickDeals(opts: { set?: SocialSet; category?: string; limit?: number } = {}): Promise<SocialDeal[]> {
  const now = Date.now();
  let list = (await getAllDeals()).filter((d) => !d.draft && isPriceFresh(d, now)).map(enrich);
  if (opts.set === "unter50") list = list.filter((d) => (d.price ?? 0) <= 50);
  if (opts.category && opts.category !== "alle") {
    const cat = CATEGORIES.find((c) => c.slug === opts.category);
    if (cat) list = list.filter((d) => d.category === cat.name);
  }
  return list.sort((a, b) => b.score - a.score).slice(0, opts.limit ?? 5);
}

export function categoryBySlug(slug?: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

const TAGS = "#blackfriday #blackfriday2026 #deals #techdeals #angebote #schnäppchen #sparen #gadgets #technik";

export function dealsLink(source: string, medium: string, category?: string): string {
  const p = new URLSearchParams({ utm_source: source, utm_medium: medium, utm_campaign: campaign.slug });
  if (category && category !== "alle") p.set("kategorie", category);
  return `${PUBLIC_BASE_URL}/deals?${p.toString()}`;
}

const ratingEmoji = (r: SocialDeal["rating"]) => (r === "hot" ? "🔥" : r === "good" ? "👍" : "👌");

/** Caption für den Karussell-Post. */
export function carouselCaption(deals: SocialDeal[], set: SocialSet): string {
  const head =
    set === "unter50"
      ? `💸 ${deals.length} Tech-Deals unter 50 € – heute bei Amazon`
      : `🔥 Top ${deals.length} Tech-Deals des Tages – ${campaign.name}`;
  const lines = deals.map((d, i) => {
    const save = d.save ? ` (du sparst ${formatPrice(d.save)})` : "";
    return `${i + 1}. ${ratingEmoji(d.rating)} ${d.title} – ${formatPrice(d.price ?? 0)}${save}`;
  });
  return [
    head,
    "",
    ...lines,
    "",
    "👉 Alle Deals mit Link: Link in Bio → Black Friday Deals",
    TELEGRAM_CHANNEL_URL ? "🔔 Sofort-Alarm für neue Deals: Telegram-Kanal (Link in Bio)" : "",
    "💾 Speichern & mit Freunden teilen!",
    "",
    "Preise Stand heute, können sich jederzeit ändern.",
    `#Anzeige | ${AMAZON_DISCLOSURE}`,
    "",
    TAGS,
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
}

export interface AdCopy {
  primary: string;
  headline: string;
  description: string;
}

/** Werbetexte (Meta-Werbeanzeigen) – ohne Amazon-Marke im Werbetext. */
export function adCopies(categorySlug: string, deals: SocialDeal[]): AdCopy[] {
  const cat = categoryBySlug(categorySlug);
  const topic = cat ? cat.name : "Tech";
  const maxPct = Math.max(0, ...deals.map((d) => d.discount));
  const pctText = maxPct >= 10 ? `bis zu -${maxPct} %` : "stark reduziert";
  return [
    {
      primary: `${cat?.emoji ?? "🔥"} Black Friday Woche: Die besten ${topic}-Deals des Tages an einem Ort – ${pctText}. Laufend aktualisiert, mit Preis & Ersparnis auf einen Blick.`,
      headline: `${topic}-Deals ${pctText}`,
      description: "Täglich neu · nur echte Preissenkungen",
    },
    {
      primary: `Keine Lust, stundenlang nach Black-Friday-Angeboten zu suchen? 🙌 Ich sammle die besten ${topic}-Deals für dich – sortiert nach Hot, Gut & Solide.`,
      headline: "Die Hot Deals zuerst 🔥",
      description: "Kostenlos · ohne Anmeldung",
    },
    {
      primary: `🔔 Gute Deals sind oft nach Minuten weg. Hol dir den kostenlosen Deal-Alarm aufs Handy und verpasse keinen ${topic}-Deal mehr in der Black Friday Woche.`,
      headline: "Deal-Alarm aufs Handy",
      description: "Kostenlos über Telegram",
    },
  ];
}

export const AD_FORMATS = {
  square: { width: 1080, height: 1080, label: "1:1 Feed" },
  portrait: { width: 1080, height: 1350, label: "4:5 Feed" },
  story: { width: 1080, height: 1920, label: "9:16 Story/Reel" },
} as const;
export type AdFormat = keyof typeof AD_FORMATS;
