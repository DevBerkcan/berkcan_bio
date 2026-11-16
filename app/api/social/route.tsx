import { ImageResponse } from "next/og";
import { campaign, formatPrice } from "@/lib/deals";
import { fetchImageDataUrl } from "@/lib/og";
import { AD_FORMATS, categoryBySlug, pickDeals, type AdFormat, type SocialDeal, type SocialSet } from "@/lib/social";

/**
 * Instagram-Grafiken aus den aktuellen Deals:
 *   ?kind=carousel&set=top|unter50&n=0..6     Karussell 1080×1350 (0 = Titel, 1–5 = Deals, 6 = Abschluss)
 *   ?kind=story&n=0..4                         Story 1080×1920 (0–3 = Hot Deals, 4 = Telegram-Aufruf)
 *   ?kind=ad&format=square|portrait|story&cat=<slug|alle>   Werbemotiv
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";

const BG = "linear-gradient(155deg, #0a0a0a 0%, #1e1035 55%, #4c1d95 100%)";
const BADGE = {
  hot: { text: "🔥 HOT DEAL", bg: "linear-gradient(90deg, #f97316, #dc2626)", color: "white" },
  good: { text: "👍 GUTER DEAL", bg: "#10b981", color: "white" },
  ok: { text: "👌 SOLIDER DEAL", bg: "#e5e7eb", color: "#111827" },
} as const;

function dateLabel() {
  return new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" }).format(new Date());
}

async function imageFor(d: SocialDeal) {
  return d.image ? await fetchImageDataUrl(d.image) : null;
}

function Pill({ text, bg, color, size = 30 }: { text: string; bg: string; color: string; size?: number }) {
  return (
    <div style={{ display: "flex", alignSelf: "flex-start", flexShrink: 0, padding: "10px 26px", borderRadius: 999, background: bg, color, fontSize: size, fontWeight: 800, letterSpacing: 2 }}>
      {text}
    </div>
  );
}

function Footer({ text = "Anzeige · Affiliate-Links · Preise können sich ändern" }: { text?: string }) {
  return <div style={{ display: "flex", flexShrink: 0, marginTop: "auto", paddingTop: 16, fontSize: 24, color: "#a1a1aa" }}>{text}</div>;
}

function PriceBlock({ d, big = 96 }: { d: SocialDeal; big?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
        <span style={{ fontSize: big, fontWeight: 900 }}>{formatPrice(d.price ?? 0)}</span>
        {d.oldPrice && d.price && d.oldPrice > d.price ? (
          <span style={{ fontSize: big * 0.42, color: "#a1a1aa", textDecoration: d.oldPriceLabel ? "none" : "line-through" }}>
            {d.oldPriceLabel ? `${d.oldPriceLabel}: ` : ""}
            {formatPrice(d.oldPrice)}
          </span>
        ) : null}
      </div>
      {d.save ? (
        <div style={{ display: "flex", alignSelf: "flex-start", marginTop: 14, padding: "10px 24px", borderRadius: 999, background: "#16a34a", fontSize: big * 0.4, fontWeight: 800 }}>
          Du sparst {formatPrice(d.save)}
        </div>
      ) : null}
    </div>
  );
}

function DealSlide({ d, img, rank, total, height }: { d: SocialDeal; img: string | null; rank?: number; total?: number; height: number }) {
  const b = BADGE[d.rating];
  const imgH = height > 1500 ? 820 : 600;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, color: "white", padding: 64, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Pill text={b.text} bg={b.bg} color={b.color} />
        {rank ? <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#fbbf24" }}>#{rank}{total ? ` / ${total}` : ""}</div> : null}
      </div>
      <div style={{ marginTop: 36, height: imgH, borderRadius: 40, background: "white", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" width={imgH - 120} height={imgH - 120} style={{ objectFit: "contain" }} />
        ) : (
          <div style={{ display: "flex", fontSize: 56, color: "#9ca3af" }}>{d.category}</div>
        )}
        {d.discount >= 5 ? (
          <div style={{ position: "absolute", top: 24, right: 24, display: "flex", padding: "14px 26px", borderRadius: 24, background: "#dc2626", fontSize: 64, fontWeight: 900, color: "white" }}>
            -{d.discount}%
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", marginTop: 36, fontSize: d.title.length > 45 ? 46 : 56, fontWeight: 800, lineHeight: 1.15 }}>{d.title}</div>
      {d.subtitle && !/mydealz/i.test(d.subtitle) ? (
        <div style={{ display: "flex", marginTop: 10, fontSize: 30, color: "#d4d4d8" }}>{d.subtitle}</div>
      ) : null}
      <div style={{ display: "flex", marginTop: 28 }}>
        <PriceBlock d={d} />
      </div>
      {height > 1500 ? (
        <div style={{ display: "flex", marginTop: 40, fontSize: 34, color: "#fbbf24", fontWeight: 700 }}>👆 Link zum Deal im Sticker</div>
      ) : null}
      <Footer />
    </div>
  );
}

async function carousel(set: SocialSet, n: number) {
  const deals = await pickDeals({ set, limit: 5 });
  const size = { width: 1080, height: 1350 };
  if (n === 0) {
    const thumbs = await Promise.all(deals.slice(0, 3).map(imageFor));
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, color: "white", padding: 80, fontFamily: "sans-serif" }}>
          <Pill text={`${campaign.name.toUpperCase()} · ${dateLabel()}`} bg="#fbbf24" color="#0a0a0a" size={28} />
          <div style={{ display: "flex", marginTop: 60, fontSize: 120, fontWeight: 900, lineHeight: 1 }}>
            {set === "unter50" ? "Unter 50 €" : `Top ${deals.length}`}
          </div>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 800, lineHeight: 1.05, color: "#fbbf24" }}>Tech-Deals heute 🔥</div>
          <div style={{ display: "flex", gap: 24, marginTop: 70 }}>
            {thumbs.map((t, i) => (
              <div key={i} style={{ width: 290, height: 290, borderRadius: 32, background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {t ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t} alt="" width={240} height={240} style={{ objectFit: "contain" }} />
                ) : null}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: 70, fontSize: 48, fontWeight: 700 }}>Wischen für alle Deals 👉</div>
          <Footer />
        </div>
      ),
      { ...size, emoji: "twemoji" }
    );
  }
  if (n >= 1 && n <= deals.length) {
    const d = deals[n - 1];
    return new ImageResponse(<DealSlide d={d} img={await imageFor(d)} rank={n} total={deals.length} height={size.height} />, { ...size, emoji: "twemoji" });
  }
  // Abschlussfolie
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", background: BG, color: "white", padding: 90, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 900, lineHeight: 1.05 }}>Alle Deals mit Link</div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 900, color: "#fbbf24" }}>→ Link in Bio</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 70, fontSize: 44 }}>
          <div style={{ display: "flex" }}>🔥 Laufend neue Deals – sortiert nach Kategorie</div>
          <div style={{ display: "flex" }}>🔔 Sofort-Alarm über Telegram</div>
          <div style={{ display: "flex" }}>💾 Speichern & Freunden schicken</div>
          <div style={{ display: "flex" }}>➕ Folgen für tägliche Deals</div>
        </div>
        <Footer />
      </div>
    ),
    { ...size, emoji: "twemoji" }
  );
}

async function story(n: number) {
  const size = { width: 1080, height: 1920 };
  const deals = await pickDeals({ limit: 4 });
  if (n < deals.length) {
    const d = deals[n];
    return new ImageResponse(<DealSlide d={d} img={await imageFor(d)} height={size.height} />, { ...size, emoji: "twemoji" });
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", background: BG, color: "white", padding: 90, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 160 }}>🔔</div>
        <div style={{ display: "flex", marginTop: 30, fontSize: 92, fontWeight: 900, lineHeight: 1.05 }}>Nie wieder einen Deal verpassen</div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 48, color: "#d4d4d8" }}>Die besten Black-Friday-Deals sofort aufs Handy – kostenlos über Telegram</div>
        <div style={{ display: "flex", marginTop: 80, padding: "26px 56px", borderRadius: 999, background: "#229ED9", fontSize: 52, fontWeight: 800 }}>👆 Link-Sticker antippen</div>
        <Footer text="Anzeige · Affiliate-Links" />
      </div>
    ),
    { ...size, emoji: "twemoji" }
  );
}

async function ad(format: AdFormat, catSlug: string) {
  const size = AD_FORMATS[format];
  const cat = categoryBySlug(catSlug);
  const deals = await pickDeals({ category: catSlug, limit: 4 });
  const imgs = (await Promise.all(deals.map(imageFor))).filter(Boolean) as string[];
  const maxPct = Math.max(0, ...deals.map((d) => d.discount));
  const tile = format === "square" ? 270 : format === "portrait" ? 290 : 400;
  const perRow = format === "square" ? 3 : 2;
  const topic = cat ? `${cat.emoji} ${cat.name}` : "🔥 Tech";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", background: BG, color: "white", padding: format === "story" ? "150px 70px 120px" : 70, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexShrink: 0, padding: "10px 26px", borderRadius: 999, background: "#fbbf24", color: "#0a0a0a", fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>
          BLACK FRIDAY WOCHE · 19.–30.11.
        </div>
        <div style={{ display: "flex", marginTop: 34, fontSize: format === "square" ? 76 : 88, fontWeight: 900, lineHeight: 1.05 }}>{topic}-Deals</div>
        <div style={{ display: "flex", marginTop: 10, fontSize: format === "square" ? 52 : 60, fontWeight: 800, color: "#fbbf24" }}>
          {maxPct >= 10 ? `bis zu -${maxPct} %` : "täglich neu reduziert"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 22, marginTop: format === "square" ? 36 : 50, maxWidth: tile * perRow + 22 * (perRow - 1) + 4, flexShrink: 0 }}>
          {(imgs.length ? imgs : [null, null]).slice(0, perRow === 3 ? 3 : 4).map((src, i) => (
            <div key={i} style={{ width: tile, height: tile, flexShrink: 0, borderRadius: 32, background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" width={tile - 50} height={tile - 50} style={{ objectFit: "contain" }} />
              ) : null}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexShrink: 0, marginTop: format === "square" ? 40 : 50, padding: "22px 50px", borderRadius: 999, background: "white", color: "#4c1d95", fontSize: 44, fontWeight: 900 }}>
          Jetzt Deals ansehen →
        </div>
        <Footer text="Anzeige · Affiliate-Links · Preise können sich ändern" />
      </div>
    ),
    { ...size, emoji: "twemoji" }
  );
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const kind = q.get("kind");
  const n = Math.max(0, Math.min(10, Number(q.get("n") ?? 0) || 0));
  try {
    if (kind === "carousel") return await carousel(q.get("set") === "unter50" ? "unter50" : "top", n);
    if (kind === "story") return await story(n);
    if (kind === "ad") {
      const f = (q.get("format") ?? "square") as AdFormat;
      return await ad(f in AD_FORMATS ? f : "square", q.get("cat") ?? "alle");
    }
    return new Response("kind fehlt (carousel | story | ad)", { status: 400 });
  } catch (e) {
    return new Response(`Fehler: ${(e as Error).message}`, { status: 500 });
  }
}
