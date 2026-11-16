"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { trackEvent } from "@/lib/tracking";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
const STORE_KEY = "deals_utm";

/** UTM-Parameter der aktuellen Sitzung (aus URL, sonst aus sessionStorage). */
function currentUtm(): Record<string, string> {
  const url = new URLSearchParams(window.location.search);
  const fromUrl = Object.fromEntries(UTM_KEYS.filter((k) => url.get(k)).map((k) => [k, url.get(k)!]));
  try {
    if (Object.keys(fromUrl).length) sessionStorage.setItem(STORE_KEY, JSON.stringify(fromUrl));
    else return JSON.parse(sessionStorage.getItem(STORE_KEY) ?? "{}");
  } catch {
    /* Storage blockiert */
  }
  return fromUrl;
}

/**
 * „Telegram-Kanal beitreten“ – oben als Banner und auf dem Handy als schwebender Button.
 * Führt über /go/telegram (zählt den Klick mit Quelle) zum passenden Einladungslink.
 * Zählt außerdem den Seitenaufruf (ohne Cookies).
 */
export function TelegramCta() {
  const [href, setHref] = useState("/go/telegram");
  const [showFloat, setShowFloat] = useState(false);

  useEffect(() => {
    const utm = currentUtm();
    setHref(`/go/telegram?${new URLSearchParams(utm).toString()}`);
    try {
      navigator.sendBeacon?.("/api/track", JSON.stringify({ event: "pageview", ...utm }));
    } catch {
      /* ignorieren */
    }
    const onScroll = () => setShowFloat(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onClick = (place: string) => trackEvent("telegram_click", { place, ...currentUtm() });

  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onClick("banner")}
        className="mb-6 flex items-center gap-3 rounded-2xl bg-[#229ED9] px-5 py-4 text-white shadow-md transition-transform hover:-translate-y-0.5"
      >
        <Send size={26} className="shrink-0" />
        <span className="flex-1">
          <span className="block text-lg font-bold">Telegram-Kanal beitreten</span>
          <span className="block text-sm text-white/85">Kostenloser Deal-Alarm – neue Deals sofort aufs Handy, bevor sie ausverkauft sind.</span>
        </span>
        <span className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-extrabold text-[#229ED9]">Beitreten</span>
      </a>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onClick("floating")}
        aria-label="Telegram-Kanal beitreten"
        className={`fixed inset-x-4 bottom-4 z-40 flex items-center justify-center gap-2 rounded-full bg-[#229ED9] px-5 py-3.5 font-bold text-white shadow-2xl transition-all duration-300 sm:hidden ${
          showFloat ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0"
        }`}
      >
        <Send size={20} /> Telegram-Kanal beitreten
      </a>
    </>
  );
}
