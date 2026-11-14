import { ImageResponse } from "next/og";
import {
  campaign,
  discountPercent,
  formatCheckedAt,
  formatPrice,
  isPriceFresh,
  productImage,
  savings,
} from "@/lib/deals";
import { fetchImageDataUrl } from "@/lib/og";
import { findDeal } from "@/lib/deals-server";

export const dynamic = "force-dynamic";
// Edge-Runtime: next/og im Node-Runtime ist unter Windows (Next 14) defekt
export const runtime = "edge";

/** Instagram-Story-Grafik (1080×1920) für einen Deal: /deals/<id>/story */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const deal = await findDeal(params.id);
  if (!deal) return new Response("Deal nicht gefunden", { status: 404 });

  const fresh = isPriceFresh(deal);
  const pct = fresh ? discountPercent(deal) : null;
  const save = fresh ? savings(deal) : null;
  const img = await fetchImageDataUrl(productImage(deal));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "linear-gradient(160deg, #0a0a0a 0%, #1e1035 55%, #4c1d95 100%)",
          color: "white",
          padding: "120px 80px 0",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "16px 36px",
            borderRadius: 999,
            background: "#fbbf24",
            color: "#0a0a0a",
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          {campaign.name} Deal
        </div>

        <div
          style={{
            marginTop: 70,
            width: 860,
            height: 760,
            borderRadius: 56,
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" width={700} height={620} style={{ objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", fontSize: 72, color: "#9ca3af", fontWeight: 700 }}>
              {deal.category}
            </div>
          )}
          {pct !== null && (
            <div
              style={{
                position: "absolute",
                top: -40,
                right: -30,
                display: "flex",
                padding: "24px 36px",
                borderRadius: 32,
                background: "#dc2626",
                fontSize: 84,
                fontWeight: 900,
                transform: "rotate(6deg)",
              }}
            >
              -{pct}%
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 64,
            display: "flex",
            textAlign: "center",
            fontSize: deal.title.length > 40 ? 56 : 68,
            fontWeight: 800,
            lineHeight: 1.15,
            maxWidth: 920,
          }}
        >
          {deal.title}
        </div>

        {fresh && deal.price ? (
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
              <span style={{ fontSize: 120, fontWeight: 900 }}>{formatPrice(deal.price)}</span>
              {deal.oldPrice && deal.oldPrice > deal.price && !deal.oldPriceLabel ? (
                <span style={{ fontSize: 56, color: "#a1a1aa", textDecoration: "line-through" }}>
                  {formatPrice(deal.oldPrice)}
                </span>
              ) : null}
            </div>
            {save !== null && (
              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  padding: "14px 36px",
                  borderRadius: 999,
                  background: "#16a34a",
                  fontSize: 48,
                  fontWeight: 800,
                }}
              >
                Du sparst {formatPrice(save)}
              </div>
            )}
            <span style={{ marginTop: 16, fontSize: 30, color: "#a1a1aa" }}>
              Stand {formatCheckedAt(deal.checkedAt)} Uhr · Preis kann sich ändern
            </span>
          </div>
        ) : (
          <div style={{ marginTop: 40, display: "flex", fontSize: 52, fontWeight: 700, color: "#fbbf24" }}>
            Jetzt Preis checken
          </div>
        )}

        {/* Freiraum für den Instagram-Link-Sticker */}
        <div style={{ flex: 1, display: "flex" }} />

        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "center",
            padding: "28px 0 56px",
            fontSize: 26,
            color: "#d4d4d8",
          }}
        >
          Anzeige · Als Amazon-Partner verdiene ich an qualifizierten Verkäufen.
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
