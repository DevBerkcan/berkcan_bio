import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Flame, Send } from "lucide-react";
import {
  AMAZON_DISCLOSURE,
  TELEGRAM_CHANNEL_URL,
  affiliateUrl,
  campaign,
  discountPercent,
  formatCheckedAt,
  getDeals,
  isPriceFresh,
  productImage,
  savings,
} from "@/lib/deals";
import { Countdown } from "@/components/deals/Countdown";
import { DealsBoard, type DealView } from "@/components/deals/DealsBoard";
import { Footer } from "@/components/Footer";

// Seite stündlich neu rendern, damit Preise älter als 24 h automatisch verschwinden
export const revalidate = 3600;

export const metadata: Metadata = {
  title: `${campaign.name} Deals | Berk-Can Atesoglu`,
  description:
    "Handverlesene Black-Friday-Deals für Tech, Setup & Smart Home – laufend aktualisiert.",
  openGraph: {
    title: `🔥 ${campaign.name} Deals`,
    description: "Handverlesene Tech-Deals – laufend aktualisiert.",
  },
};

export default function DealsPage() {
  const now = Date.now();
  const deals: DealView[] = getDeals().map((d) => {
    const fresh = isPriceFresh(d, now);
    return {
      id: d.id,
      title: d.title,
      subtitle: d.subtitle,
      category: d.category,
      image: productImage(d),
      featured: !!d.featured,
      draft: !!d.draft,
      url: affiliateUrl(d.asin),
      price: fresh ? d.price : undefined,
      oldPrice: fresh ? d.oldPrice : undefined,
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
            Von mir handverlesen – nur echte Preissenkungen, kein Fake-Rabatt.
          </p>
          <Countdown endsAt={campaign.endsAt} />
        </header>

        {TELEGRAM_CHANNEL_URL && (
          <a
            href={TELEGRAM_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 flex items-center gap-3 rounded-2xl bg-[#229ED9] px-5 py-4 text-white shadow-md transition-transform hover:-translate-y-0.5"
          >
            <Send size={24} className="shrink-0" />
            <span className="flex-1">
              <span className="block font-bold">Deal-Alarm auf Telegram</span>
              <span className="block text-sm text-white/85">
                Neue Deals sofort aufs Handy – bevor sie ausverkauft sind.
              </span>
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-[#229ED9]">
              Beitreten
            </span>
          </a>
        )}

        <DealsBoard deals={deals} />

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
