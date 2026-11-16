/**
 * Kleine, datensparsame Zählung für den Werbe-Trichter (keine Cookies, keine IP, keine Personen):
 *   Seitenaufrufe /deals · Klicks „Telegram beitreten“ · Telegram-Beitritte je Einladungslink
 * Speicher: Upstash Redis (Vercel-Integration). Env: KV_REST_API_URL + KV_REST_API_TOKEN
 * (oder UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN). Ohne Speicher wird nichts gezählt.
 */
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export type StatEvent = "pageview" | "telegram_click" | "join";

export function statsConfigured(): boolean {
  return Boolean(URL_ && TOKEN);
}

function berlinDay(d = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(d);
}

const clean = (s: string | null | undefined, fallback: string) =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9_\-.]/g, "").slice(0, 40) || fallback;

/** Quelle aus UTM-Parametern; ohne UTM = "direkt". */
export function sourceKey(params: URLSearchParams | Record<string, string | undefined>): string {
  const get = (k: string) => (params instanceof URLSearchParams ? params.get(k) : params[k]);
  const source = clean(get("utm_source"), "direkt");
  const medium = clean(get("utm_medium"), source === "direkt" ? "direkt" : "unbekannt");
  const campaign = clean(get("utm_campaign"), "-");
  return `${source}|${medium}|${campaign}`;
}

async function redis(cmd: (string | number)[]) {
  if (!URL_ || !TOKEN) return null;
  const res = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd.map(String)),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return ((await res.json()) as { result?: unknown }).result ?? null;
}

/** Zähler +1: Tag × Quelle × Ereignis. Fehler werden geschluckt (Zählung darf nie die Seite stören). */
export async function count(event: StatEvent, source: string): Promise<void> {
  if (!statsConfigured()) return;
  const key = `stats:${berlinDay()}`;
  try {
    await redis(["HINCRBY", key, `${source}|${event}`, 1]);
    await redis(["EXPIRE", key, 60 * 60 * 24 * 120]);
  } catch {
    /* ignorieren */
  }
}

export interface FunnelRow {
  source: string;
  medium: string;
  campaign: string;
  pageview: number;
  telegram_click: number;
  join: number;
}

/** Zahlen der letzten `days` Tage, gruppiert nach Quelle/Medium/Kampagne. */
export async function funnel(days = 14): Promise<{ rows: FunnelRow[]; perDay: { day: string; pageview: number; telegram_click: number; join: number }[] }> {
  const rows = new Map<string, FunnelRow>();
  const perDay: { day: string; pageview: number; telegram_click: number; join: number }[] = [];
  if (!statsConfigured()) return { rows: [], perDay };
  for (let i = 0; i < days; i++) {
    const day = berlinDay(new Date(Date.now() - i * 86400000));
    const flat = ((await redis(["HGETALL", `stats:${day}`])) as string[] | null) ?? [];
    const totals = { day, pageview: 0, telegram_click: 0, join: 0 };
    for (let j = 0; j < flat.length; j += 2) {
      const [source, medium, campaign, event] = flat[j].split("|");
      const n = Number(flat[j + 1]) || 0;
      const k = `${source}|${medium}|${campaign}`;
      const row = rows.get(k) ?? { source, medium, campaign, pageview: 0, telegram_click: 0, join: 0 };
      if (event === "pageview" || event === "telegram_click" || event === "join") {
        row[event] += n;
        totals[event] += n;
      }
      rows.set(k, row);
    }
    perDay.push(totals);
  }
  return { rows: [...rows.values()].sort((a, b) => b.pageview + b.join * 10 - (a.pageview + a.join * 10)), perDay };
}
