import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { funnel, statsConfigured, type FunnelRow } from "@/lib/stats";
import data from "@/data/deals.json";
import { PUBLIC_BASE_URL } from "@/lib/deals";
import { UTM_CAMPAIGN, dealsLink } from "@/lib/social";
import { CopyButton } from "@/components/deals/CopyButton";

/** Einzelne Meta-Anzeigen: eigener Einladungslink je utm_content. */
const ADS = ((data.telegram as { inviteLinks?: { name: string; content?: string }[] }).inviteLinks ?? []).filter((l) => l.content);

/** Ziel-URL der Anzeige: „vorab“ geht direkt zu Telegram (über die Zählung), sonst auf die Deal-Seite der Kategorie. */
function adTarget(content: string): string {
  if (content === "vorab") {
    const p = new URLSearchParams({ utm_source: "instagram", utm_medium: "paid_social", utm_campaign: UTM_CAMPAIGN, utm_content: content });
    return `${PUBLIC_BASE_URL}/go/telegram?${p.toString()}`;
  }
  return `${dealsLink("instagram", "paid_social", content)}&utm_content=${encodeURIComponent(content)}`;
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Zahlen · Deal-Studio",
  robots: { index: false, follow: false },
};

const LABEL: Record<string, string> = {
  "instagram|paid_social": "📣 Instagram-Anzeige",
  "instagram|organic_story": "📱 Instagram-Story",
  "ig|social": "🔗 Instagram Link in Bio",
  "ig|story": "📱 Instagram-Story (alt)",
  "telegram|channel": "✈️ Telegram-Kanal",
  "telegram|pinned": "📌 Telegram (angepinnt)",
  "telegram|direkt": "✈️ Telegram – Hauptlink",
  "telegram|anderer_link": "✈️ Telegram – anderer Link",
  "website|alle": "🌐 Website (ohne Kampagne)",
  "direkt|direkt": "🌐 Direkt / ohne Kampagne",
};

const label = (r: FunnelRow) => {
  const base = LABEL[`${r.source}|${r.medium}`] ?? `${r.source} · ${r.medium}`;
  const ad = ADS.find((a) => a.content === r.content);
  return r.content === "-" ? base : ad ? `📣 ${ad.name}` : `${base} · ${r.content}`;
};
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : "–");

export default async function ZahlenPage({ searchParams }: { searchParams: { tage?: string } }) {
  const days = Math.min(60, Math.max(1, Number(searchParams.tage) || 14));
  const { rows, perDay } = await funnel(days);
  const total = rows.reduce(
    (t, r) => ({ pageview: t.pageview + r.pageview, telegram_click: t.telegram_click + r.telegram_click, join: t.join + r.join }),
    { pageview: 0, telegram_click: 0, join: 0 }
  );
  const ads = rows.filter((r) => r.medium === "paid_social").reduce(
    (t, r) => ({ pageview: t.pageview + r.pageview, telegram_click: t.telegram_click + r.telegram_click, join: t.join + r.join }),
    { pageview: 0, telegram_click: 0, join: 0 }
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/deals/studio" className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-violet-500 dark:text-gray-400">
          <ArrowLeft size={20} /> Deal-Studio
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📊 Zahlen: Werbung → Seite → Telegram</h1>
        <div className="mt-2 flex gap-2 text-sm">
          {[1, 7, 14, 30].map((d) => (
            <Link key={d} href={`?tage=${d}`} className={`rounded-full px-3 py-1 font-semibold ${d === days ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"}`}>
              {d === 1 ? "Heute" : `${d} Tage`}
            </Link>
          ))}
        </div>

        {!statsConfigured() && (
          <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            Noch kein Speicher verbunden – es wird noch nichts gezählt. In Vercel unter <b>Storage → Upstash Redis</b> (kostenlos) eine Datenbank anlegen und mit dem Projekt
            <b> berkcan-bio</b> verbinden.
          </p>
        )}

        {/* Trichter der Instagram-Anzeige */}
        <section className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-white">📣 Instagram-Anzeigen gesamt</h2>
          <p className="text-sm text-gray-500">Klicks auf die Anzeige selbst siehst du im Meta-Werbeanzeigenmanager.</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              ["Seitenaufrufe", ads.pageview, ""],
              ["Telegram-Klicks", ads.telegram_click, pct(ads.telegram_click, ads.pageview)],
              ["Beitritte", ads.join, pct(ads.join, ads.telegram_click)],
            ].map(([t, n, p]) => (
              <div key={t as string} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
                <div className="text-3xl font-extrabold text-gray-900 dark:text-white">{n}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t}</div>
                {p && <div className="mt-1 text-xs text-emerald-600">{p} vom Schritt davor</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Einzelne Anzeigen */}
        <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-white">Je Anzeige</h2>
          <p className="text-sm text-gray-500">
            Jede Anzeige hat einen eigenen Ziel-Link und einen eigenen Telegram-Einladungslink. Kosten pro Beitritt = Meta-Ausgaben dieser Anzeige ÷ Beitritte.
          </p>
          <div className="mt-4 space-y-4">
            {ADS.map((a) => {
              const r = rows.filter((x) => x.content === a.content).reduce(
                (t, x) => ({ pageview: t.pageview + x.pageview, telegram_click: t.telegram_click + x.telegram_click, join: t.join + x.join }),
                { pageview: 0, telegram_click: 0, join: 0 }
              );
              const direct = a.content === "vorab";
              return (
                <div key={a.content} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">📣 {a.name}</span>
                    <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
                      {direct ? "" : `${r.pageview} Aufrufe → `}
                      {r.telegram_click} Telegram-Klicks{direct ? "" : ` (${pct(r.telegram_click, r.pageview)})`} → <b>{r.join} Beitritte</b>
                      {r.telegram_click > 0 && ` (${pct(r.join, r.telegram_click)})`}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {direct ? "Ziel: direkt der Telegram-Kanal (Klick wird vorher gezählt)" : `Ziel: Deal-Seite, Kategorie ${a.name.replace("Meta ", "")}`} · utm_content=
                    {a.content}
                  </p>
                  <div className="mt-2 max-w-xs">
                    <CopyButton label="Ziel-URL für Meta kopieren" text={adTarget(a.content!)} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Alle Quellen */}
        <section className="mt-6 overflow-x-auto rounded-2xl bg-white p-5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-white">Alle Quellen</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="py-2">Quelle</th>
                <th className="py-2 text-right">Aufrufe</th>
                <th className="py-2 text-right">Telegram-Klicks</th>
                <th className="py-2 text-right">Beitritte</th>
              </tr>
            </thead>
            <tbody className="text-gray-800 dark:text-gray-200">
              {rows.map((r) => (
                <tr key={`${r.source}|${r.medium}|${r.campaign}|${r.content}`} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-2">
                    {label(r)}
                    {r.campaign !== "-" && <span className="ml-1 text-xs text-gray-400">({r.campaign})</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums">{r.pageview}</td>
                  <td className="py-2 text-right tabular-nums">
                    {r.telegram_click} <span className="text-xs text-gray-400">{pct(r.telegram_click, r.pageview)}</span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{r.join}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-200 font-bold dark:border-gray-600">
                <td className="py-2">Gesamt</td>
                <td className="py-2 text-right tabular-nums">{total.pageview}</td>
                <td className="py-2 text-right tabular-nums">{total.telegram_click}</td>
                <td className="py-2 text-right tabular-nums">{total.join}</td>
              </tr>
            </tbody>
          </table>
          {rows.length === 0 && <p className="mt-3 text-sm text-gray-500">Noch keine Daten im Zeitraum.</p>}
        </section>

        {/* Verlauf */}
        <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-white">Verlauf pro Tag</h2>
          <ul className="mt-3 space-y-1 text-sm tabular-nums text-gray-700 dark:text-gray-300">
            {perDay.map((d) => (
              <li key={d.day} className="flex justify-between border-b border-gray-50 py-1 dark:border-gray-700">
                <span>{d.day}</span>
                <span>
                  {d.pageview} Aufrufe · {d.telegram_click} Klicks · {d.join} Beitritte
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-400">
            Gezählt werden nur Summen – keine Cookies, keine IP-Adressen, keine Personen. Verkäufe siehst du im Amazon-Partnernet je Tracking-ID.
          </p>
        </section>
      </div>
    </div>
  );
}
