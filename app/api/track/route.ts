import { count, sourceKey } from "@/lib/stats";

/** Seitenaufruf der Deal-Seite zählen (per navigator.sendBeacon, ohne Cookies). */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, string | undefined> = {};
  try {
    body = JSON.parse(await req.text());
  } catch {
    /* leer */
  }
  if (body.event === "pageview") await count("pageview", sourceKey(body));
  return new Response(null, { status: 204 });
}
