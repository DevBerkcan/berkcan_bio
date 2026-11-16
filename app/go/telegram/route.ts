import data from "@/data/deals.json";
import { count, sourceKey } from "@/lib/stats";

/**
 * Weiterleitung „Telegram-Kanal beitreten“: zählt den Klick (mit UTM-Quelle) und leitet weiter.
 * Je Quelle ein eigener Telegram-Einladungslink → Beitritte lassen sich der Quelle zuordnen.
 *   /go/telegram?utm_source=instagram&utm_medium=paid_social&utm_campaign=black_friday_2026
 */
export const dynamic = "force-dynamic";

interface InviteLink {
  name: string;
  url: string;
  medium: string;
  source: string;
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const tg = data.telegram as { channelUrl?: string; inviteLinks?: InviteLink[] };
  const medium = (params.get("utm_medium") ?? "").toLowerCase();
  const links = tg.inviteLinks ?? [];
  const target =
    links.find((l) => l.medium === medium)?.url ?? links.find((l) => l.medium === "website")?.url ?? tg.channelUrl ?? "https://t.me";

  await count("telegram_click", sourceKey(params));
  return new Response(null, {
    status: 302,
    headers: { Location: target, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
