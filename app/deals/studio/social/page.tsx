import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { PUBLIC_BASE_URL, TELEGRAM_CHANNEL_URL } from "@/lib/deals";
import { AD_FORMATS, UTM_CAMPAIGN, adCopies, carouselCaption, dealsLink, pickDeals, type AdFormat, type SocialSet } from "@/lib/social";

/** Sticker-Link für eine Story: Deal-Seite mit Sprungmarke + Kampagnen-Parametern. */
function storyLink(id: string) {
  return `${dealsLink("instagram", "organic_story")}&utm_content=${encodeURIComponent(id)}#${id}`;
}
import { CATEGORIES } from "@/scripts/categories.mjs";
import { CopyButton } from "@/components/deals/CopyButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Social-Studio",
  robots: { index: false, follow: false },
};

const ver = () => new Date().toISOString().slice(0, 13); // Cache-Buster pro Stunde

function Img({ src, name, ratio }: { src: string; name: string; ratio: string }) {
  return (
    <figure className="space-y-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} loading="lazy" className={`w-full rounded-xl bg-gray-900 object-cover ring-1 ring-gray-200 dark:ring-gray-700 ${ratio}`} />
      <a
        href={src}
        download={`${name}.png`}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
      >
        <Download size={14} /> {name}
      </a>
    </figure>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 rounded-2xl bg-white p-5 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
      {hint && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function SocialStudio({ searchParams }: { searchParams: { set?: string } }) {
  const set: SocialSet = searchParams.set === "unter50" ? "unter50" : "top";
  const v = ver();
  const carouselDeals = await pickDeals({ set, limit: 5 });
  const storyDeals = await pickDeals({ limit: 4 });

  // Kategorien mit mind. 2 aktuellen Deals für Werbemotive
  const adCats: { slug: string; name: string; emoji: string; count: number }[] = [];
  const all = await pickDeals({ limit: 999 });
  adCats.push({ slug: "alle", name: "Alle Tech-Deals", emoji: "🔥", count: all.length });
  for (const c of CATEGORIES) {
    const n = all.filter((d) => d.category === c.name).length;
    if (n >= 2 && c.slug !== "amazon-geraete") adCats.push({ slug: c.slug, name: c.name, emoji: c.emoji, count: n });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/deals/studio" className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-violet-500 dark:text-gray-400">
          <ArrowLeft size={20} /> Deal-Studio
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📸 Social-Studio</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Alles wird automatisch aus den aktuell besten Deals erzeugt (Stand: jede Stunde neu). Herunterladen → in Instagram hochladen.
        </p>

        {/* 1. Karussell */}
        <Section
          title="1 · Karussell-Post (Feed)"
          hint="7 Bilder in dieser Reihenfolge als einen Beitrag hochladen, dann die Caption einfügen. Ideal: 1 Post pro Tag, abends 18–20 Uhr."
        >
          <div className="mb-4 flex gap-2 text-sm">
            <Link href="?set=top" className={`rounded-full px-3 py-1.5 font-semibold ${set === "top" ? "bg-violet-600 text-white" : "bg-gray-100 dark:bg-gray-700 dark:text-gray-200"}`}>
              🔥 Top 5 des Tages
            </Link>
            <Link href="?set=unter50" className={`rounded-full px-3 py-1.5 font-semibold ${set === "unter50" ? "bg-violet-600 text-white" : "bg-gray-100 dark:bg-gray-700 dark:text-gray-200"}`}>
              💸 Unter 50 €
            </Link>
          </div>
          {carouselDeals.length < 3 ? (
            <p className="text-sm text-amber-700">Gerade zu wenige Deals mit aktuellem Preis – später nochmal schauen.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {Array.from({ length: carouselDeals.length + 2 }, (_, n) => (
                  <Img key={n} src={`/api/social?kind=carousel&set=${set}&n=${n === carouselDeals.length + 1 ? 6 : n}&v=${v}`} name={`post-${n + 1}`} ratio="aspect-[4/5]" />
                ))}
              </div>
              <div className="mt-4 max-w-xs">
                <CopyButton label="Caption kopieren" text={carouselCaption(carouselDeals, set)} />
              </div>
            </>
          )}
        </Section>

        {/* 2. Storys */}
        <Section
          title="2 · Story-Serie"
          hint="Jede Story einzeln hochladen und den passenden Link als Link-Sticker setzen. Letzte Story = Aufruf für den Telegram-Kanal."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {storyDeals.map((d, n) => (
              <div key={d.id} className="space-y-1.5">
                <Img src={`/api/social?kind=story&n=${n}&v=${v}`} name={`story-${n + 1}`} ratio="aspect-[9/16]" />
                <CopyButton label="Sticker-Link" text={storyLink(d.id)} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Img src={`/api/social?kind=story&n=9&v=${v}`} name="story-telegram" ratio="aspect-[9/16]" />
              {TELEGRAM_CHANNEL_URL && (
                <CopyButton label="Telegram-Link" text={`${PUBLIC_BASE_URL}/go/telegram?utm_source=instagram&utm_medium=organic_story&utm_campaign=${UTM_CAMPAIGN}`} />
              )}
            </div>
          </div>
        </Section>

        {/* 3. Werbe-Paket */}
        <Section
          title="3 · Werbe-Paket (Meta-Werbeanzeigen)"
          hint="Pro Kategorie: Motive in 3 Formaten, Ziel-Link und 3 Textvarianten. Im Werbeanzeigenmanager hochladen (Anleitung unten)."
        >
          <div className="space-y-8">
            {adCats.map((c) => {
              const deals = all.filter((d) => c.slug === "alle" || d.category === c.name);
              const copies = adCopies(c.slug, deals);
              return (
                <div key={c.slug} className="border-t border-gray-100 pt-6 first:border-0 first:pt-0 dark:border-gray-700">
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    {c.emoji} {c.name} <span className="font-normal text-gray-400">· {c.count} Deals</span>
                  </h3>
                  <div className="mt-3 grid grid-cols-3 gap-3 sm:max-w-xl">
                    {(Object.keys(AD_FORMATS) as AdFormat[]).map((f) => (
                      <Img
                        key={f}
                        src={`/api/social?kind=ad&format=${f}&cat=${c.slug}&v=${v}`}
                        name={`ad-${c.slug}-${f}`}
                        ratio={f === "square" ? "aspect-square" : f === "portrait" ? "aspect-[4/5]" : "aspect-[9/16]"}
                      />
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <CopyButton label="Ziel-Link (Anzeige)" text={dealsLink("instagram", "paid_social", c.slug)} />
                    {copies.map((cp, i) => (
                      <CopyButton key={i} label={`Text ${i + 1}: ${cp.headline}`} text={`Primärtext:\n${cp.primary}\n\nÜberschrift:\n${cp.headline}\n\nBeschreibung:\n${cp.description}`} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* 4. Anleitung */}
        <Section title="4 · So schaltest du die Anzeige (ca. 10 Minuten)">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300">
            <li>
              <b>Instagram-Profil auf „Professionell“</b> stellen (Einstellungen → Kontotyp) und mit einer Facebook-Seite verbinden.
            </li>
            <li>
              <b>business.facebook.com → Werbeanzeigenmanager → Erstellen</b>. Kampagnenziel: <b>„Traffic“</b> (Website-Besuche).
            </li>
            <li>
              <b>Budget:</b> zum Start <b>5–10 € pro Tag</b>, Laufzeit 19.–30.11. Pro Kategorie eine eigene Anzeigengruppe – so siehst du, was funktioniert.
            </li>
            <li>
              <b>Zielgruppe:</b> Deutschland, 18–45 Jahre, Interessen z. B. „Technologie“, „Unterhaltungselektronik“, „Videospiele“, „Schnäppchen“ bzw. passend zur Kategorie.
              Platzierungen: Instagram Feed + Storys + Reels.
            </li>
            <li>
              <b>Anzeige:</b> Motive oben herunterladen (1:1 oder 4:5 für Feed, 9:16 für Storys/Reels), Text 1–3 einfügen, Ziel-URL = kopierter „Ziel-Link“,
              Call-to-Action „Mehr dazu“. Drei Textvarianten als Varianten anlegen – Meta testet automatisch, welche am besten läuft.
            </li>
            <li>
              <b>Auswerten:</b> Unter <a className="underline" href="/deals/studio/zahlen">Deal-Studio → Zahlen</a> siehst du Seitenaufrufe, Telegram-Klicks und
              Beitritte je Quelle; im Partnernet die Verkäufe über <code>berkcanat-ig-21</code>. Kategorien mit Ergebnis hochfahren, andere pausieren.
            </li>
          </ol>
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            <b>Wichtig:</b> Anzeigen auf die eigene Deal-Seite oder den Telegram-Kanal leiten – <b>nicht direkt auf Amazon</b>. Keine Amazon-Logos im Werbetext
            verwenden und die aktuellen Richtlinien des Partnerprogramms zu bezahlter Werbung im Partnernet prüfen. Die Motive sind als „Anzeige“ gekennzeichnet.
          </div>
        </Section>
      </div>
    </div>
  );
}
