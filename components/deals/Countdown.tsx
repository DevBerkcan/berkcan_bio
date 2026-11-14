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

export function Countdown({ endsAt }: { endsAt: string }) {
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Vor der Hydration nichts rendern, sonst Server/Client-Mismatch
  if (now === null) return <div className="mt-6 h-[68px]" aria-hidden />;

  if (now >= end) {
    return (
      <p className="mt-6 text-sm font-semibold text-gray-500 dark:text-gray-400">
        Die Aktion ist vorbei – einige Deals laufen eventuell noch.
      </p>
    );
  }

  return (
    <div className="mt-6 flex justify-center gap-2" role="timer" aria-label="Zeit bis Aktionsende">
      {Object.entries(parts(end - now)).map(([label, value]) => (
        <div
          key={label}
          className="w-16 rounded-xl bg-white py-2 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        >
          <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
            {String(value).padStart(2, "0")}
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
