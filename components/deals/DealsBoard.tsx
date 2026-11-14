"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, ShoppingBag, Star } from "lucide-react";
import { trackEvent } from "@/lib/tracking";
import { channelFromSource, type Channel } from "@/lib/deals";

const CHANNEL_KEY = "deals_channel";

export interface DealView {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  image?: string;
  featured: boolean;
  draft: boolean;
  asin: string;
  url: string;
  price?: number;
  oldPrice?: number;
  discount: number | null;
  savings: number | null;
  checkedLabel?: string;
}

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function DealsBoard({
  deals,
  trackingIds,
}: {
  deals: DealView[];
  trackingIds: Record<Channel, string>;
}) {
  // Herkunft (Instagram-Story / Telegram) merken, damit Amazon den Verkauf dem Kanal zuordnet
  const [channel, setChannel] = useState<Channel>("web");
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("utm_source");
    let c: Channel = channelFromSource(fromUrl);
    try {
      if (fromUrl) sessionStorage.setItem(CHANNEL_KEY, c);
      else c = (sessionStorage.getItem(CHANNEL_KEY) as Channel) || "web";
    } catch {
      /* Storage blockiert – dann nur URL */
    }
    setChannel(trackingIds[c] ? c : "web");
  }, [trackingIds]);
  const hrefFor = (d: DealView) =>
    `https://www.amazon.de/dp/${encodeURIComponent(d.asin)}?tag=${trackingIds[channel]}`;

  const categories = useMemo(
    () => ["Alle", ...Array.from(new Set(deals.map((d) => d.category)))],
    [deals]
  );
  const [active, setActive] = useState("Alle");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set());

  // Story-Link mit #deal-id: zum Deal scrollen und kurz hervorheben
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    setHighlight(id);
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlight(null), 2500);
    return () => clearTimeout(t);
  }, []);

  const visible = active === "Alle" ? deals : deals.filter((d) => d.category === active);

  if (deals.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-8 text-center text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700">
        Die ersten Deals kommen in Kürze – schau gleich nochmal vorbei. 👀
      </p>
    );
  }

  return (
    <>
      {categories.length > 2 && (
        <nav className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Kategorien">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              aria-pressed={active === c}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active === c
                  ? "bg-violet-600 text-white"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-violet-400 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
              }`}
            >
              {c}
            </button>
          ))}
        </nav>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {visible.map((d, i) => (
          <li key={d.id} id={d.id} className={d.featured && active === "Alle" && i === 0 ? "sm:col-span-2" : ""}>
            <a
              href={hrefFor(d)}
              target="_blank"
              rel="sponsored noopener noreferrer"
              onClick={() =>
                trackEvent("deal_click", {
                  deal_id: d.id,
                  channel,
                  category: d.category,
                  price: d.price,
                  discount: d.discount,
                })
              }
              className={`group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-md ring-1 transition-all hover:-translate-y-0.5 hover:shadow-xl dark:bg-gray-800 ${
                highlight === d.id
                  ? "ring-4 ring-violet-500"
                  : "ring-gray-200 hover:ring-violet-400 dark:ring-gray-700"
              }`}
            >
              <div className="relative flex aspect-[4/3] items-center justify-center bg-gray-50 p-6 dark:bg-gray-900/40">
                {d.image && !brokenImages.has(d.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={d.image}
                    alt={d.title}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    onError={() => setBrokenImages((s) => new Set(s).add(d.id))}
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <ShoppingBag size={56} className="text-gray-300 dark:text-gray-600" />
                )}
                {d.discount !== null && (
                  <span className="absolute left-3 top-3 rounded-lg bg-red-600 px-2.5 py-1 text-sm font-extrabold text-white shadow">
                    -{d.discount}%
                  </span>
                )}
                {d.featured && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2 py-1 text-xs font-bold text-gray-900">
                    <Star size={12} fill="currentColor" /> Top-Deal
                  </span>
                )}
                {d.draft && (
                  <span className="absolute bottom-3 left-3 rounded bg-gray-900/80 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    Entwurf
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-violet-500">
                  {d.category}
                </span>
                <h2 className="mt-1 font-semibold leading-snug text-gray-900 dark:text-white">
                  {d.title}
                </h2>
                {d.subtitle && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{d.subtitle}</p>
                )}

                <div className="mt-auto pt-4">
                  {d.price !== undefined ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                          {eur.format(d.price)}
                        </span>
                        {d.oldPrice && d.oldPrice > d.price && (
                          <span className="text-sm text-gray-400 line-through">{eur.format(d.oldPrice)}</span>
                        )}
                      </div>
                      {d.savings !== null && (
                        <span className="mt-1 inline-block rounded-md bg-green-100 px-2 py-0.5 text-sm font-bold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                          Du sparst {eur.format(d.savings)}
                        </span>
                      )}
                      <p className="mt-1 text-[11px] text-gray-400">
                        Stand {d.checkedLabel} Uhr · Preis kann sich ändern
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Aktuellen Preis auf Amazon ansehen
                    </p>
                  )}

                  <span className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3 text-sm font-bold text-white transition-colors group-hover:from-violet-600 group-hover:to-purple-700">
                    Zum Deal auf Amazon <ExternalLink size={16} />
                  </span>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
