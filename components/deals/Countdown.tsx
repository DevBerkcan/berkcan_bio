"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    Tage: Math.floor(s / 86400),
    Std: Math.floor((s % 86400) / 3600),
    Min: Math.floor((s % 3600) / 60),
    Sek: s % 60,
  };
}

/**
 * Vor dem Start: Countdown bis zum Beginn der Black Friday Woche (frühe Deals laufen schon).
 * Während der Aktion: Countdown bis zum Ende (Cyber Monday).
 */
export function Countdown({ startsAt, endsAt }: { startsAt?: string; endsAt: string }) {
  const start = startsAt ? new Date(startsAt).getTime() : 0;
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Vor der Hydration nichts rendern, sonst Server/Client-Mismatch
  if (now === null) return <div className="mt-6 h-[92px]" aria-hidden />;

  if (now >= end) {
    return (
      <p className="mt-6 text-sm font-semibold text-gray-500 dark:text-gray-400">
        Die Black Friday Woche ist vorbei – einige Deals laufen eventuell noch.
      </p>
    );
  }

  const beforeStart = now < start;
  const target = beforeStart ? start : end;

  return (
    <div className="mt-6">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
        {beforeStart ? "🔥 Frühe Deals live · Black Friday Woche startet in" : "⏳ Black Friday Woche endet in"}
      </p>
      <div className="flex justify-center gap-2" role="timer" aria-label={beforeStart ? "Zeit bis Aktionsstart" : "Zeit bis Aktionsende"}>
        {Object.entries(parts(target - now)).map(([label, value]) => (
          <div
            key={label}
            className="w-16 rounded-xl bg-white py-2 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
          >
            <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {String(value).padStart(2, "0")}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
