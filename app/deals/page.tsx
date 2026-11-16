import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Flame } from "lucide-react";
import {
  AMAZON_DISCLOSURE,
  TELEGRAM_CHANNEL_URL,
  TRACKING_IDS,
  affiliateUrl,
  campaign,
  discountPercent,
  formatCheckedAt,
  isPriceFresh,
  productImage,
  savings,
} from "@/lib/deals";
import { getAllDeals } from "@/lib/deals-server";
import { categorize } from "@/scripts/categories.mjs";
import { dealScore, rateDeal, temperatureFromSubtitle } from "@/scripts/rating.mjs";
import { TelegramCta } from "@/components/deals/TelegramCta";
import { Countdown } from "@/components/deals/Countdown";
import { DealsBoard, type DealView } from "@/components/deals/DealsBoard";
import { Footer } from "@/components/Footer";

// Alle 5 Min neu rendern: neue Autopilot-Deals erscheinen, Preise älter als 24 h verschwinden
export const revalidate = 300;

export const metadata: Metadata = {
  title: `${campaign.name} Deals | Berk-Can Atesoglu`,
  description:
    "Aktuelle Black-Friday-Deals auf Amazon für Tech, Gaming, Smart Home & Haushalt – laufend aktualisiert.",
  openGraph: {
    title: `🔥 ${campaign.name} Deals`,
    description: "Aktuelle Amazon-Deals – laufend aktualisiert.",
  },
};

export default async function DealsPage() {
  const now = Date.now();
  const deals: DealView[] = (await getAllDeals()).map((d) => {
    const fresh = isPriceFresh(d, now);
    return {
      id: d.id,
      title: d.title,
      subtitle: d.subtitle,
      category: categorize(d.title, "", d.category),
      ...(() => {
        const r = { price: d.price, oldPrice: d.oldPrice, temperature: d.temperature ?? temperatureFromSubtitle(d.subtitle) };
        return { rating: rateDeal(r).key as "hot" | "good" | "ok", score: dealScore(r) };
      })(),
      image: productImage(d),
      featured: !!d.featured,
      draft: !!d.draft,
      asin: d.asin,
      url: affiliateUrl(d.asin),
      price: fresh ? d.price : undefined,
      oldPrice: fresh ? d.oldPrice : undefined,
      oldPriceLabel: d.oldPriceLabel,
      discount: fresh ? discountPercent(d) : null,
      savings: fresh ? savings(d) : null,
      checkedLabel: fresh ? formatCheckedAt(d.checkedAt) : undefined,
    };
  });

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-300">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-violet-500/15 to-transparent" />

      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 transition-colors hover:text-violet-500"
        >
          <ArrowLeft size={20} />
          <span>Zurück</span>
        </Link>

        <header className="mb-8 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white dark:bg-white dark:text-gray-900">
            <Flame size={14} className="text-amber-400 dark:text-amber-500" />
            {campaign.name}
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Die besten Tech-Deals
          </h1>
          <p className="mx-auto mt-3 max-w-md text-gray-600 dark:text-gray-400">
            Laufend aktualisiert – neue Amazon-Angebote rund um die Uhr, sortiert nach Kategorie.
          </p>
          <Countdown startsAt={campaign.startsAt} endsAt={campaign.endsAt} />
        </header>

        {TELEGRAM_CHANNEL_URL && <TelegramCta />}

        <DealsBoard deals={deals} trackingIds={TRACKING_IDS} />

        <div className="mt-10 rounded-2xl bg-white/70 p-4 text-center text-xs leading-relaxed text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800/60 dark:text-gray-400 dark:ring-gray-700">
          <p className="font-semibold text-gray-700 dark:text-gray-300">
            Anzeige · {AMAZON_DISCLOSURE}
          </p>
          <p className="mt-1">
            Für dich ändert sich am Preis nichts. Preise und Verfügbarkeit
            beziehen sich auf den angegebenen Zeitpunkt und können sich
            jederzeit ändern. Maßgeblich ist der Preis auf Amazon.de zum
            Zeitpunkt des Kaufs.
          </p>
        </div>

        <Footer />
      </div>
    </div>
  );
}
