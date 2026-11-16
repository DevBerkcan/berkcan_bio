"use client";

import { useState } from "react";
import { ExternalLink, ShoppingBag } from "lucide-react";
import { trackEvent } from "@/lib/tracking";

export interface GadgetView {
  name: string;
  description: string;
  category: string;
  url: string;
  image?: string;
  mine: boolean;
}

export function GadgetCard({ gadget: g }: { gadget: GadgetView }) {
  const [broken, setBroken] = useState(false);

  return (
    <a
      href={g.url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={() => trackEvent("gadget_click", { name: g.name, category: g.category })}
      className="group flex h-full items-center gap-4 rounded-2xl bg-white p-3 shadow-md ring-1 ring-gray-200 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:ring-violet-400 dark:bg-gray-800 dark:ring-gray-700"
    >
      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 ring-1 ring-gray-100 dark:ring-gray-700">
        {g.image && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={g.image}
            alt={g.name}
            loading="lazy"
            onError={() => setBroken(true)}
            onLoad={(e) => {
              if (e.currentTarget.naturalWidth <= 1) setBroken(true);
            }}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <ShoppingBag size={30} className="text-gray-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-500">{g.category}</span>
        <h3 className="font-semibold leading-snug text-gray-900 dark:text-white">{g.name}</h3>
        <p className="mt-0.5 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{g.description}</p>
      </div>
      <ExternalLink size={18} className="flex-shrink-0 text-gray-400 transition-colors group-hover:text-violet-500" />
    </a>
  );
}
