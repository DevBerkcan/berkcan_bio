import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { caption, getDeals, isPriceFresh, storyLink } from "@/lib/deals";
import { CopyButton } from "@/components/deals/CopyButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deal-Studio",
  robots: { index: false, follow: false },
};

/**
 * Arbeitsseite für Instagram: Story-Grafik herunterladen, Caption und
 * Sticker-Link kopieren. Nicht verlinkt und nicht indexiert.
 */
export default function StudioPage() {
  const deals = getDeals();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/deals" className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-violet-500 dark:text-gray-400">
          <ArrowLeft size={20} /> Zur Deal-Seite
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deal-Studio</h1>
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
          <li>Story-Grafik herunterladen und als Instagram-Story hochladen</li>
          <li>Link-Sticker hinzufügen und den kopierten Sticker-Link einfügen</li>
          <li>Für Posts/Reels: Caption kopieren</li>
        </ol>

        {deals.length === 0 && <p className="mt-8 text-gray-500">Noch keine Deals. Füge welche mit <code>npm run deal</code> hinzu.</p>}

        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((d) => {
            const img = `/deals/${d.id}/story`;
            return (
              <li key={d.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`Story ${d.title}`} className="aspect-[9/16] w-full bg-gray-900 object-cover" loading="lazy" />
                <div className="space-y-2 p-4">
                  <p className="font-semibold text-gray-900 dark:text-white">{d.title}</p>
                  {!isPriceFresh(d) && (
                    <p className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
                      Preis älter als 24 h – wird ausgeblendet. Neu prüfen mit <code>npm run deal -- {d.asin} --price …</code>
                    </p>
                  )}
                  <a
                    href={img}
                    download={`story-${d.id}.png`}
                    className="block rounded-lg bg-violet-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-violet-700"
                  >
                    Story-Grafik herunterladen
                  </a>
                  <CopyButton label="Sticker-Link kopieren" text={storyLink(d)} />
                  <CopyButton label="Caption kopieren" text={caption(d)} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
