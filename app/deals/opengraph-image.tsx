import { ImageResponse } from "next/og";

// Vorschaubild beim Teilen von /deals (WhatsApp, Instagram-DM, Telegram, Facebook …)
export const runtime = "edge";
export const alt = "Black Friday Tech-Deals – täglich neu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const chips = ["🎧 Audio", "💻 Computer", "📺 TV", "🎮 Gaming", "🏠 Smart Home", "🧹 Haushalt"];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px 80px",
          background: "linear-gradient(140deg, #0a0a0a 0%, #1e1035 55%, #4c1d95 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            padding: "10px 26px",
            borderRadius: 999,
            background: "#fbbf24",
            color: "#0a0a0a",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: 3,
          }}
        >
          BLACK FRIDAY WOCHE · 19.–30.11.
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 84, fontWeight: 800, lineHeight: 1.05 }}>
          Die besten Tech-Deals
        </div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 36, color: "#d4d4d8" }}>
          Laufend aktualisiert · mit Preis & Ersparnis
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 44 }}>
          {chips.map((c) => (
            <div
              key={c}
              style={{
                display: "flex",
                padding: "10px 22px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                fontSize: 28,
              }}
            >
              {c}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 26, color: "#a1a1aa" }}>
          gentlelink.berkcanatesoglu.de/deals · Anzeige
        </div>
      </div>
    ),
    { ...size, emoji: "twemoji" }
  );
}
