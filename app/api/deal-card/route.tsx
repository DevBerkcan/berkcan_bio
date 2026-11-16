import { ImageResponse } from "next/og";
import { BRAND, FONT_FAMILY, brandImageOptions } from "@/lib/brand";
import { amazonImageUrl, campaign, formatPrice, savings } from "@/lib/deals";
import { fetchImageDataUrl } from "@/lib/og";

export const runtime = "edge";

/**
 * Quadratische Deal-Grafik (1080×1080) für Telegram & Feed-Posts.
 * Zustandslos, damit sie schon vor dem Deploy eines neuen Deals funktioniert:
 *   /api/deal-card?asin=B0...&title=...&price=249&old=379.99&ts=<ISO>[&img=<url>]
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const asin = (q.get("asin") ?? "").toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(asin)) return new Response("asin fehlt", { status: 400 });

  const title = (q.get("title") ?? "").slice(0, 90);
  const num = (k: string) => {
    const n = Number(q.get(k));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const price = num("price");
  const oldPrice = num("old");
  const save = savings({ price, oldPrice });
  const pct = save && oldPrice ? Math.round((save / oldPrice) * 100) : null;
  const ts = q.get("ts");
  const refLabel = (q.get("ref") ?? "").slice(0, 20);
  const rate = q.get("rate");
  const badge =
    rate === "hot"
      ? BRAND.rating.hot
      : rate === "good"
        ? BRAND.rating.good
        : rate === "ok"
          ? BRAND.rating.ok
          : { text: `${campaign.name} Deal`, bg: BRAND.accentGrad, color: "#1a0d00" };
  const stamp = ts
    ? new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Berlin",
      }).format(new Date(ts))
    : null;

  const custom = q.get("img");
  const img =
    (custom && /^https:\/\//.test(custom) ? await fetchImageDataUrl(custom) : null) ??
    (await fetchImageDataUrl(amazonImageUrl(asin, 800, "03"))) ??
    (await fetchImageDataUrl(amazonImageUrl(asin, 800, "01")));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BRAND.bg,
          color: "white",
          padding: 56,
          fontFamily: FONT_FAMILY,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              padding: "10px 26px",
              borderRadius: 999,
              background: badge.bg,
              color: badge.color,
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {badge.text}
          </div>
          {pct !== null && (
            <div
              style={{
                display: "flex",
                padding: "12px 28px",
                borderRadius: 24,
                background: BRAND.sale,
                fontSize: 64,
                fontWeight: 900,
              }}
            >
              -{pct}%
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 32,
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 40,
            background: "white",
            overflow: "hidden",
          }}
        >
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" width={520} height={470} style={{ objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", fontSize: 56, color: "#9ca3af", fontWeight: 700 }}>
              {title || asin}
            </div>
          )}
        </div>

        <div style={{ marginTop: 28, display: "flex", fontSize: title.length > 50 ? 36 : 44, fontWeight: 800, lineHeight: 1.15 }}>
          {title}
        </div>

        <div style={{ marginTop: 18, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {price ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
                <span style={{ fontSize: 84, fontWeight: 900 }}>{formatPrice(price)}</span>
                {oldPrice && oldPrice > price ? (
                  refLabel ? (
                    <span style={{ fontSize: 32, color: "#a1a1aa" }}>
                      {refLabel}: {formatPrice(oldPrice)}
                    </span>
                  ) : (
                    <span style={{ fontSize: 40, color: "#a1a1aa", textDecoration: "line-through" }}>
                      {formatPrice(oldPrice)}
                    </span>
                  )
                ) : null}
              </div>
            ) : (
              <span style={{ fontSize: 52, fontWeight: 800, color: BRAND.accent }}>Preis auf Amazon ansehen</span>
            )}
            {stamp && (
              <span style={{ fontSize: 22, color: "#a1a1aa" }}>
                Stand {stamp} Uhr · Preis kann sich ändern · Anzeige
              </span>
            )}
          </div>
          {save !== null && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "14px 26px",
                borderRadius: 24,
                background: BRAND.save, color: "#06260f",
              }}
            >
              <span style={{ fontSize: 24, fontWeight: 700 }}>Du sparst</span>
              <span style={{ fontSize: 48, fontWeight: 900 }}>{formatPrice(save)}</span>
            </div>
          )}
        </div>
      </div>
    ),
    await brandImageOptions({ width: 1080, height: 1080 }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } })
  );
}
