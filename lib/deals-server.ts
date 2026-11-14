// Nur serverseitig verwenden.
import localAuto from "@/data/auto-deals.json";
import { getDeals, isPriceFresh, type Deal } from "@/lib/deals";

/**
 * Der Autopilot (GitHub Actions) schreibt data/auto-deals.json ins Repo.
 * In Produktion lesen wir die Datei direkt von GitHub – so erscheinen neue Deals
 * ohne neues Vercel-Deployment (Cache max. 5 Min).
 */
const AUTO_DEALS_URL =
  "https://raw.githubusercontent.com/DevBerkcan/berkcan_bio/main/data/auto-deals.json";

export async function getAutoDeals(): Promise<Deal[]> {
  let list = localAuto as Deal[];
  if (process.env.NODE_ENV === "production") {
    try {
      const res = await fetch(AUTO_DEALS_URL, { next: { revalidate: 300 } });
      if (res.ok) list = (await res.json()) as Deal[];
    } catch (e) {
      console.error("[deals] Autopilot-Deals nicht ladbar:", e);
    }
  }
  const now = Date.now();
  return list.filter((d) => isPriceFresh(d, now));
}

/** Top-Deals zuerst, dann neueste Autopilot-Deals, dann übrige manuelle Deals. */
export async function getAllDeals(): Promise<Deal[]> {
  const manual = getDeals();
  const manualAsins = new Set(manual.map((d) => d.asin));
  const auto = (await getAutoDeals())
    .filter((d) => !manualAsins.has(d.asin))
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  return [...manual.filter((d) => d.featured), ...auto, ...manual.filter((d) => !d.featured)];
}

export async function findDeal(id: string): Promise<Deal | undefined> {
  return (await getAllDeals()).find((d) => d.id === id);
}
