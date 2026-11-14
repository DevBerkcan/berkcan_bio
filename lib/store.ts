/**
 * Minimaler Upstash-Redis-Client (REST, ohne Zusatzpaket).
 * Env: KV_REST_API_URL + KV_REST_API_TOKEN (Vercel-Marketplace-Integration)
 *  oder UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 */
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export function storeConfigured(): boolean {
  return Boolean(URL_ && TOKEN);
}

async function cmd<T = unknown>(...args: (string | number)[]): Promise<T | null> {
  if (!URL_ || !TOKEN) return null;
  const res = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args.map(String)),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${args[0]} fehlgeschlagen: ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: string };
  if (json.error) throw new Error(`Redis: ${json.error}`);
  return json.result ?? null;
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await cmd<string>("GET", key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  await cmd("SET", key, JSON.stringify(value));
}

/** Setzt key nur, wenn er noch nicht existiert. true = neu gesetzt. */
export async function setOnce(key: string, ttlSeconds: number): Promise<boolean> {
  return (await cmd<string>("SET", key, "1", "NX", "EX", ttlSeconds)) === "OK";
}

export async function exists(key: string): Promise<boolean> {
  return (await cmd<number>("EXISTS", key)) === 1;
}

export async function incr(key: string, ttlSeconds: number): Promise<number> {
  const n = (await cmd<number>("INCR", key)) ?? 0;
  if (n === 1) await cmd("EXPIRE", key, ttlSeconds);
  return n;
}

export async function getNumber(key: string): Promise<number> {
  return Number((await cmd<string>("GET", key)) ?? 0);
}
