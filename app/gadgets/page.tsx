import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import data from "@/data/gadgets.json";
import { AMAZON_DISCLOSURE, AFFILIATE_TAG } from "@/lib/deals";
import { GadgetCard, type GadgetView } from "@/components/gadgets/GadgetCard";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Meine Gadgets & Desk-Setup | Berk-Can Atesoglu",
  description:
    "Schreibtische, Monitore, Monitorarme, Licht, Maus & Tastatur – Tech & Gadgets für das perfekte Home-Office-Setup.",
};

interface GadgetItem {
  name: string;
  description: string;
  category: string;
  /** ASIN aus dem Amazon-Link. Ohne ASIN: Amazon-Suche (search) mit Partner-Tag. */
  asin?: string;
  search?: string;
  mine?: boolean;
}

function toView(g: GadgetItem): GadgetView {
  const url = g.asin
    ? `https://www.amazon.de/dp/${g.asin}?tag=${AFFILIATE_TAG}`
    : `https://www.amazon.de/s?k=${encodeURIComponent(g.search ?? g.name)}&tag=${AFFILIATE_TAG}`;
  return {
    name: g.name,
    description: g.description,
    category: g.category,
    url,
    image: g.asin
      ? `https://m.media-amazon.com/images/P/${g.asin}.03._SCLZZZZZZZ_SX300_.jpg`
      : undefined,
    mine: !!g.mine,
  };
}

export default function GadgetsPage() {
  const items = (data.items as GadgetItem[]).map(toView);
  const mine = items.filter((g) => g.mine);
  const categories = data.categories.filter((c) => items.some((g) => !g.mine && g.category === c));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-gray-600 transition-colors hover:text-violet-500 dark:text-gray-400"
        >
          <ArrowLeft size={20} />
          <span>Zurück</span>
        </Link>

        <header className="mb-10 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/50">
            <ShoppingBag size={32} className="text-violet-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gadgets & Desk-Setup</h1>
          <p className="mx-auto mt-2 max-w-md text-gray-600 dark:text-gray-400">
            Mein Setup und Empfehlungen für Schreibtisch, Monitore, Licht & Co.
          </p>
          <nav className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Kategorien">
            {mine.length > 0 && (
              <a href="#mein-setup" className="rounded-full bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white">
                Mein Setup
              </a>
            )}
            {categories.map((c) => (
              <a
                key={c}
                href={`#${slug(c)}`}
                className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:ring-violet-400 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
              >
                {c}
              </a>
            ))}
          </nav>
        </header>

        {mine.length > 0 && (
          <Section id="mein-setup" title="⭐ Mein Setup" items={mine} />
        )}
        {categories.map((c) => (
          <Section key={c} id={slug(c)} title={c} items={items.filter((g) => !g.mine && g.category === c)} />
        ))}

        <p className="mt-10 text-center text-xs text-gray-400 dark:text-gray-500">
          Anzeige · {AMAZON_DISCLOSURE} Du zahlst dadurch nicht mehr.
        </p>

        <Footer />
      </div>
    </div>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/&/g, "und").replace(/[^a-z0-9äöü]+/g, "-");
}

function Section({ id, title, items }: { id: string; title: string; items: GadgetView[] }) {
  return (
    <section id={id} className="mb-10 scroll-mt-6">
      <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((g) => (
          <li key={g.name}>
            <GadgetCard gadget={g} />
          </li>
        ))}
      </ul>
    </section>
  );
}
