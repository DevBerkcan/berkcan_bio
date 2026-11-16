import { ImageResponse } from "next/og";
import { formatPrice } from "@/lib/deals";
import { fetchImageDataUrl } from "@/lib/og";
import { BRAND, FONT_FAMILY, brandImageOptions } from "@/lib/brand";
import { AD_FORMATS, categoryBySlug, pickDeals, type AdFormat, type SocialDeal, type SocialSet } from "@/lib/social";

/**
 * Instagram-Grafiken aus den aktuellen Deals:
 *   ?kind=carousel&set=top|unter50&n=0..6     Karussell 1080×1350 (0 = Titel, 1–5 = Deals, 6 = Abschluss)
 *   ?kind=story&n=0..4                         Story 1080×1920 (0–3 = Hot Deals, danach Telegram-Aufruf)
 *   ?kind=ad&format=square|portrait|story&cat=<slug|alle>   Werbemotiv
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";

const HANDLE = "@berkcandaily";

function dateLabel() {
  return new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" }).format(new Date());
}

async function imageFor(d: SocialDeal) {
  return d.image ? await fetchImageDataUrl(d.image) : null;
}

const frame = (padding: number | string) =>
  ({
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: BRAND.bg,
    color: BRAND.text,
    padding,
    fontFamily: FONT_FAMILY,
  }) as const;

function TopBar({ right }: { right?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 18, height: 18, borderRadius: 999, background: BRAND.accent, display: "flex" }} />
        <div style={{ display: "flex", fontSize: 26, fontWeight: 800, letterSpacing: 4, color: BRAND.soft }}>BLACK FRIDAY DEALS</div>
      </div>
      {right ? <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: BRAND.muted }}>{right}</div> : null}
    </div>
  );
}

function Footer({ text = "Anzeige · Affiliate-Links · Preise können sich ändern" }: { text?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, marginTop: "auto", paddingTop: 18, fontSize: 22, color: BRAND.muted }}>
      <span>{text}</span>
      <span style={{ fontWeight: 700, color: BRAND.soft }}>{HANDLE}</span>
    </div>
  );
}

function RatingPill({ rating }: { rating: SocialDeal["rating"] }) {
  const b = BRAND.rating[rating];
  return (
    <div style={{ display: "flex", flexShrink: 0, alignSelf: "flex-start", padding: "12px 26px", borderRadius: 999, background: b.bg, color: b.color, fontSize: 28, fontWeight: 900, letterSpacing: 2 }}>
      {b.text}
    </div>
  );
}

function ProductCard({ img, size, discount, fallback }: { img: string | null; size: number; discount?: number; fallback: string }) {
  return (
    <div
      style={{
        height: size,
        flexShrink: 0,
        borderRadius: 44,
        background: BRAND.card,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
      }}
    >
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" width={size - 130} height={size - 130} style={{ objectFit: "contain" }} />
      ) : (
        <div style={{ display: "flex", fontSize: 52, fontWeight: 700, color: "#a1a1aa" }}>{fallback}</div>
      )}
      {discount && discount >= 5 ? (
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            display: "flex",
            padding: "12px 24px",
            borderRadius: 20,
            background: BRAND.sale,
            color: "white",
            fontSize: 56,
            fontWeight: 900,
            letterSpacing: -1,
          }}
        >
          -{discount}%
        </div>
      ) : null}
    </div>
  );
}

function PriceBlock({ d, big = 104 }: { d: SocialDeal; big?: number }) {
  const hasRef = d.oldPrice && d.price && d.oldPrice > d.price;
  return (
    <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
        <span style={{ fontSize: big, fontWeight: 900, letterSpacing: -3 }}>{formatPrice(d.price ?? 0)}</span>
        {hasRef ? (
          <span style={{ fontSize: big * 0.38, fontWeight: 500, color: BRAND.muted, textDecoration: d.oldPriceLabel ? "none" : "line-through" }}>
            {d.oldPriceLabel ? `${d.oldPriceLabel} ` : "statt "}
            {formatPrice(d.oldPrice!)}
          </span>
        ) : null}
      </div>
      {d.save ? (
        <div style={{ display: "flex", alignSelf: "flex-start", marginTop: 16, padding: "10px 24px", borderRadius: 999, background: "rgba(34,197,94,0.15)", border: `2px solid ${BRAND.save}`, color: BRAND.save, fontSize: big * 0.33, fontWeight: 800 }}>
          Du sparst {formatPrice(d.save)}
        </div>
      ) : null}
    </div>
  );
}

function DealSlide({ d, img, rank, total, story }: { d: SocialDeal; img: string | null; rank?: number; total?: number; story?: boolean }) {
  return (
    <div style={frame(story ? "110px 72px 80px" : "64px 72px 56px")}>
      <TopBar right={rank ? `${rank} / ${total}` : dateLabel()} />
      <div style={{ display: "flex", marginTop: 36 }}>
        <RatingPill rating={d.rating} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
        <ProductCard img={img} size={story ? 820 : 560} discount={d.discount} fallback={d.category} />
      </div>
      <div style={{ display: "flex", marginTop: 36, fontSize: d.title.length > 45 ? 46 : 56, fontWeight: 800, lineHeight: 1.12, letterSpacing: -1 }}>{d.title}</div>
      {d.subtitle && !/mydealz/i.test(d.subtitle) ? (
        <div style={{ display: "flex", marginTop: 12, fontSize: 28, fontWeight: 500, color: BRAND.soft, lineHeight: 1.3 }}>{d.subtitle}</div>
      ) : null}
      <div style={{ display: "flex", marginTop: 26 }}>
        <PriceBlock d={d} />
      </div>
      {story ? (
        <div style={{ display: "flex", marginTop: 44, alignSelf: "flex-start", padding: "16px 30px", borderRadius: 999, background: BRAND.accentGrad, color: "#1a0d00", fontSize: 34, fontWeight: 900 }}>
          👆 Link im Sticker
        </div>
      ) : null}
      <Footer />
    </div>
  );
}

async function carousel(set: SocialSet, n: number) {
  const deals = await pickDeals({ set, limit: 5 });
  const size = { width: 1080, height: 1350 };
  const opts = await brandImageOptions(size);
  if (n === 0) {
    const thumbs = await Promise.all(deals.slice(0, 3).map(imageFor));
    const maxPct = Math.max(0, ...deals.map((d) => d.discount));
    return new ImageResponse(
      (
        <div style={frame("72px 72px 56px")}>
          <TopBar right={dateLabel()} />
          <div style={{ display: "flex", marginTop: 90, fontSize: 40, fontWeight: 800, color: BRAND.accent, letterSpacing: 3 }}>
            {set === "unter50" ? "SPAR-TIPPS UNTER 50 €" : "HEUTE IM ANGEBOT"}
          </div>
          <div style={{ display: "flex", marginTop: 14, fontSize: 132, fontWeight: 900, lineHeight: 0.95, letterSpacing: -5 }}>
            {set === "unter50" ? "Unter 50 €" : `Top ${deals.length}`}
          </div>
          <div style={{ display: "flex", fontSize: 132, fontWeight: 900, lineHeight: 1, letterSpacing: -5, color: BRAND.accent }}>Tech-Deals</div>
          {maxPct >= 10 ? (
            <div style={{ display: "flex", marginTop: 26, fontSize: 44, fontWeight: 700, color: BRAND.soft }}>bis zu -{maxPct} % reduziert</div>
          ) : null}
          <div style={{ display: "flex", gap: 22, marginTop: 64 }}>
            {thumbs.map((t, i) => (
              <div key={i} style={{ width: 296, height: 296, borderRadius: 36, background: BRAND.card, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }}>
                {t ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t} alt="" width={236} height={236} style={{ objectFit: "contain" }} />
                ) : null}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: 56, alignSelf: "flex-start", padding: "18px 34px", borderRadius: 999, background: BRAND.accentGrad, color: "#1a0d00", fontSize: 36, fontWeight: 900 }}>
            Wischen für alle Deals →
          </div>
          <Footer />
        </div>
      ),
      opts
    );
  }
  if (n >= 1 && n <= deals.length) {
    const d = deals[n - 1];
    return new ImageResponse(<DealSlide d={d} img={await imageFor(d)} rank={n} total={deals.length} />, opts);
  }
  // Abschlussfolie
  const items = ["Laufend neue Deals – nach Kategorie sortiert", "Sofort-Alarm über Telegram", "Speichern & Freunden schicken", "Folgen für tägliche Deals"];
  return new ImageResponse(
    (
      <div style={frame("72px 72px 56px")}>
        <TopBar />
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: "auto" }}>
          <div style={{ display: "flex", fontSize: 110, fontWeight: 900, lineHeight: 1, letterSpacing: -4 }}>Alle Deals</div>
          <div style={{ display: "flex", fontSize: 110, fontWeight: 900, lineHeight: 1.05, letterSpacing: -4, color: BRAND.accent }}>Link in Bio</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 70 }}>
            {items.map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 40, fontWeight: 600 }}>
                <div style={{ width: 44, height: 44, borderRadius: 999, background: BRAND.accent, color: "#1a0d00", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900 }}>✓</div>
                {t}
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    ),
    opts
  );
}

async function story(n: number) {
  const size = { width: 1080, height: 1920 };
  const opts = await brandImageOptions(size);
  const deals = await pickDeals({ limit: 4 });
  if (n < deals.length) {
    const d = deals[n];
    return new ImageResponse(<DealSlide d={d} img={await imageFor(d)} story />, opts);
  }
  return new ImageResponse(
    (
      <div style={frame("110px 80px 80px")}>
        <TopBar />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginTop: "auto", marginBottom: "auto" }}>
          <div style={{ display: "flex", fontSize: 170 }}>🔔</div>
          <div style={{ display: "flex", marginTop: 30, fontSize: 104, fontWeight: 900, lineHeight: 1, letterSpacing: -4 }}>Kein Deal</div>
          <div style={{ display: "flex", fontSize: 104, fontWeight: 900, lineHeight: 1.05, letterSpacing: -4, color: BRAND.accent }}>mehr verpassen</div>
          <div style={{ display: "flex", marginTop: 40, fontSize: 44, fontWeight: 500, color: BRAND.soft, lineHeight: 1.3 }}>Die besten Black-Friday-Deals sofort aufs Handy – kostenlos über Telegram</div>
          <div style={{ display: "flex", marginTop: 80, padding: "26px 56px", borderRadius: 999, background: "#229ED9", fontSize: 50, fontWeight: 900 }}>👆 Link-Sticker antippen</div>
        </div>
        <Footer text="Anzeige · Affiliate-Links" />
      </div>
    ),
    opts
  );
}

async function ad(format: AdFormat, catSlug: string) {
  const size = AD_FORMATS[format];
  const opts = await brandImageOptions(size);
  const cat = categoryBySlug(catSlug);
  const deals = await pickDeals({ category: catSlug, limit: 4 });
  const imgs = (await Promise.all(deals.map(imageFor))).filter(Boolean) as string[];
  const maxPct = Math.max(0, ...deals.map((d) => d.discount));
  const perRow = format === "square" ? 3 : 2;
  const tile = format === "square" ? 272 : format === "portrait" ? 300 : 410;
  const topic = cat ? cat.name : "Tech";
  return new ImageResponse(
    (
      <div style={frame(format === "story" ? "130px 72px 90px" : "64px 72px 52px")}>
        <TopBar right="19.–30.11." />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginTop: format === "square" ? 36 : 64 }}>
          <div style={{ display: "flex", fontSize: format === "square" ? 84 : 100, fontWeight: 900, lineHeight: 1, letterSpacing: -4 }}>
            {cat?.emoji ?? "🔥"} {topic}-Deals
          </div>
          <div style={{ display: "flex", marginTop: 14, fontSize: format === "square" ? 52 : 62, fontWeight: 900, color: BRAND.accent, letterSpacing: -1 }}>
            {maxPct >= 10 ? `bis zu -${maxPct} %` : "täglich neu reduziert"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 22, marginTop: format === "square" ? 40 : 56, maxWidth: tile * perRow + 22 * (perRow - 1) + 4 }}>
            {(imgs.length ? imgs : [null, null]).slice(0, perRow === 3 ? 3 : 4).map((src, i) => (
              <div key={i} style={{ width: tile, height: tile, flexShrink: 0, borderRadius: 36, background: BRAND.card, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }}>
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" width={tile - 56} height={tile - 56} style={{ objectFit: "contain" }} />
                ) : null}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: format === "square" ? 40 : 60, padding: "22px 52px", borderRadius: 999, background: BRAND.accentGrad, color: "#1a0d00", fontSize: 42, fontWeight: 900 }}>
            Jetzt Deals ansehen →
          </div>
        </div>
        <Footer />
      </div>
    ),
    opts
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
