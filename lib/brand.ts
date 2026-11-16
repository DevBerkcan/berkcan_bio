/**
 * Einheitliches Design für alle erzeugten Grafiken (Instagram, Telegram, Story, Vorschaubild).
 * Look: edles Schwarz mit warmem Orange – klassischer Black-Friday-Stil, gut lesbar am Handy.
 */
export const BRAND = {
  bg: "linear-gradient(160deg, #0b0b0d 0%, #141417 55%, #22160c 100%)",
  bgFlat: "#0f0f11",
  text: "#ffffff",
  muted: "#a1a1aa",
  soft: "#d4d4d8",
  accent: "#ff7a1a", // Orange
  accentGrad: "linear-gradient(90deg, #ffb020 0%, #ff6a00 100%)",
  sale: "#ff3b30", // Rabatt-Badge
  save: "#22c55e", // Ersparnis
  card: "#ffffff",
  line: "rgba(255,255,255,0.12)",
  chip: "rgba(255,255,255,0.08)",
  rating: {
    hot: { text: "🔥 HOT DEAL", bg: "linear-gradient(90deg, #ff8a00, #ff3b30)", color: "#ffffff" },
    good: { text: "👍 GUTER DEAL", bg: "#22c55e", color: "#06260f" },
    ok: { text: "👌 SOLIDER DEAL", bg: "#3f3f46", color: "#ffffff" },
  },
} as const;

type Weight = 500 | 700 | 800 | 900;
const FONT_URL = (w: Weight) => `https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-${w}-normal.woff`;

let fontsPromise: Promise<{ name: string; data: ArrayBuffer; weight: Weight; style: "normal" }[]> | null = null;

/** Inter in mehreren Stärken – ohne echte Fett-Schrift wirken Grafiken dünn. Fällt bei Fehlern auf die Standardschrift zurück. */
export function brandFonts() {
  fontsPromise ??= Promise.all(
    ([500, 700, 800, 900] as Weight[]).map(async (weight) => {
      const res = await fetch(FONT_URL(weight));
      if (!res.ok) throw new Error(`Font ${weight}: ${res.status}`);
      return { name: "Inter", data: await res.arrayBuffer(), weight, style: "normal" as const };
    })
  ).catch(() => {
    fontsPromise = null;
    return [];
  });
  return fontsPromise;
}

/** Optionen für ImageResponse: Größe + Schrift + Emojis. */
export async function brandImageOptions(size: { width: number; height: number }, extra: Record<string, unknown> = {}) {
  const fonts = await brandFonts();
  return { ...size, emoji: "twemoji" as const, ...(fonts.length ? { fonts } : {}), ...extra };
}

export const FONT_FAMILY = "Inter, sans-serif";
