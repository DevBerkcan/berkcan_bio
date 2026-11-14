/**
 * Gemeinsame Logik der Deal-Inbox (Telegram-Webhook): Nachrichten mit einem
 * oder mehreren Amazon-Links zerlegen, ASIN auflösen, Warteschlange auf GitHub.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const ASIN_RE = /\/(?:dp|gp\/product|gp\/aw\/d|d)\/([A-Z0-9]{10})(?=[/?#]|$)/i;
const LINK_RE = /https?:\/\/\S*(?:amazon\.|amzn\.to|amzn\.eu|a\.co\/)\S*/i;
const PRICE = String.raw`(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)`;
const PRICE_RE = new RegExp(`${PRICE}\\s*(?:€|EUR|Euro)`, "gi");
const REF_RE = new RegExp(
  `(?:statt|UVP|VGP|PVG|Vergleichspreis|zuvor|sonst|vorher)\\s*:?\\s*(?:ca\\.\\s*)?${PRICE}\\s*(?:€|EUR|Euro)?`,
  "i"
);

export interface ParsedDeal {
  url: string;
  title?: string;
  price?: number;
  oldPrice?: number;
}

export interface QueueItem {
  asin: string;
  title: string;
  price?: number;
  oldPrice?: number;
  addedAt: string;
}

function euro(s: string): number | undefined {
  const n = Number(s.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function cleanLine(l: string): string {
  return l
    .replace(/https?:\/\/\S+/g, "")
    .replace(new RegExp(REF_RE.source, "gi"), "")
    .replace(PRICE_RE, "")
    .replace(/\(\s*\)|\[\s*\]/g, "")
    .replace(/\s+(?:für|ab|nur|um|zum|statt)\s*$/i, "")
    .replace(/[\p{Extended_Pictographic}️]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s|•\-–:\d.)]+|[|•\-–:]+\s*$/g, "")
    .trim();
}

function shorten(t: string, max = 70): string {
  return t.length > max ? `${t.slice(0, t.lastIndexOf(" ", max))} …` : t;
}

/**
 * Zerlegt eine Nachricht in Deals. Jede Zeile mit Amazon-Link = ein Deal;
 * Textzeilen direkt davor gelten als Titel. Preise dürfen in Link- oder Titelzeile stehen.
 */
export function parseDeals(text: string): ParsedDeal[] {
  const out: ParsedDeal[] = [];
  let buffer: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const link = line.match(LINK_RE)?.[0];
    if (!link) {
      buffer.push(line);
      continue;
    }
    const block = [...buffer, line].join(" ");
    const ref = block.match(REF_RE);
    const oldPrice = ref ? euro(ref[1]) : undefined;
    const rest = ref ? block.replace(ref[0], " ") : block;
    const price = [...rest.replace(/https?:\/\/\S+/g, " ").matchAll(PRICE_RE)].map((m) => euro(m[1])).find(Boolean);
    const title = [...buffer, line].map(cleanLine).find((l) => l.length >= 4);
    out.push({
      url: link.replace(/[),.]+$/, ""),
      title: title ? shorten(title) : undefined,
      price,
      oldPrice: oldPrice && price && oldPrice > price ? oldPrice : undefined,
    });
    buffer = [];
  }
  return out;
}

/** "Logitech-Master-Kabellose-Performance-Maus" aus amazon.de/<slug>/dp/ASIN */
function titleFromSlug(url: string): string | undefined {
  const m = url.match(/amazon\.[a-z.]+\/([^/?#]+)\/(?:dp|gp\/product)\//i);
  if (!m || /^-$|^dp$/i.test(m[1])) return undefined;
  const t = decodeURIComponent(m[1]).replace(/-/g, " ").replace(/\s+/g, " ").trim();
  return t.length >= 6 ? shorten(t) : undefined;
}

/** Löst Kurzlinks über den Redirect-Header auf (keine Produktseite wird geladen). */
export async function resolveAsin(url: string): Promise<{ asin: string; slugTitle?: string } | null> {
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    const m = current.match(ASIN_RE);
    if (m && /amazon\./i.test(current)) return { asin: m[1].toUpperCase(), slugTitle: titleFromSlug(current) };
    const res = await fetch(current, { method: "HEAD", redirect: "manual", headers: { "User-Agent": UA } });
    const loc = res.headers.get("location");
    if (!loc) break;
    current = new URL(loc, current).toString();
  }
  return null;
}

// ---------- Warteschlange auf GitHub ----------
// Der Webhook legt pro Nachricht eine NEUE Datei data/queue/<zeit>.json an (nie überschreiben),
// der Autopilot (GitHub Actions) sammelt sie ein und postet nach und nach.

const REPO = "DevBerkcan/berkcan_bio";

export function queueConfigured(): boolean {
  return Boolean(process.env.GITHUB_QUEUE_TOKEN);
}

export async function enqueue(items: QueueItem[]): Promise<void> {
  const name = `data/queue/${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 6)}.json`;
  const content = Buffer.from(JSON.stringify(items, null, 2) + "\n").toString("base64");
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${name}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_QUEUE_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `chore(queue): ${items.length} Deal(s) eingereiht [skip ci]`,
      content,
      branch: "main",
      committer: { name: "deal-inbox[bot]", email: "41898282+github-actions[bot]@users.noreply.github.com" },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Anzahl wartender Deals (data/queue.json + noch nicht eingesammelte Dateien). */
export async function queueSize(): Promise<number | null> {
  try {
    const headers = { Accept: "application/vnd.github+json", Authorization: `Bearer ${process.env.GITHUB_QUEUE_TOKEN}` };
    const [mainRes, dirRes] = await Promise.all([
      fetch(`https://raw.githubusercontent.com/${REPO}/main/data/queue.json`, { cache: "no-store" }),
      fetch(`https://api.github.com/repos/${REPO}/contents/data/queue`, { headers, cache: "no-store" }),
    ]);
    const main = mainRes.ok ? ((await mainRes.json()) as unknown[]).length : 0;
    let pending = 0;
    if (dirRes.ok) {
      const files = (await dirRes.json()) as { name: string; download_url: string }[];
      for (const f of files.filter((x) => x.name.endsWith(".json"))) {
        const r = await fetch(f.download_url, { cache: "no-store" });
        if (r.ok) pending += ((await r.json()) as unknown[]).length;
      }
    }
    return main + pending;
  } catch {
    return null;
  }
}
