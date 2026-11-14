import data from "@/data/deals.json";

/**
 * Wachhund (Vercel Cron, 2× täglich): Prüft, ob der Autopilot in GitHub Actions
 * noch läuft. Letzter Lauf älter als 2 Stunden → private Telegram-Nachricht an dich.
 * Env (Vercel): CRON_SECRET, TELEGRAM_BOT_TOKEN
 */
export const dynamic = "force-dynamic";

const STATE_URL =
  "https://raw.githubusercontent.com/DevBerkcan/berkcan_bio/main/data/autopilot-state.json";
const MAX_SILENCE_MS = 2 * 3600 * 1000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(data.autopilot as { enabled?: boolean }).enabled) return Response.json({ status: "disabled" });

  let lastRunAt: string | undefined;
  try {
    const res = await fetch(`${STATE_URL}?t=${Date.now()}`, { cache: "no-store" });
    lastRunAt = ((await res.json()) as { lastRunAt?: string }).lastRunAt;
  } catch {
    /* unten als „unbekannt“ behandelt */
  }

  const silentFor = lastRunAt ? Date.now() - Date.parse(lastRunAt) : Infinity;
  if (silentFor <= MAX_SILENCE_MS) return Response.json({ status: "ok", lastRunAt });

  const hours = Number.isFinite(silentFor) ? Math.round(silentFor / 3600000) : null;
  const text = [
    "🚨 <b>Deal-Bot steht still</b>",
    hours !== null ? `Letzter Lauf vor ca. ${hours} Std.` : "Letzter Lauf unbekannt.",
    "",
    "Neu starten: GitHub → Actions → Deal-Autopilot → <b>Run workflow</b>",
    "https://github.com/DevBerkcan/berkcan_bio/actions/workflows/deal-autopilot.yml",
  ].join("\n");

  const owners = ((data.telegram as { ownerIds?: string[] }).ownerIds ?? []).map(String);
  for (const chat_id of owners) {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
      cache: "no-store",
    }).catch(() => null);
  }
  return Response.json({ status: "alerted", lastRunAt });
}
