// Nur serverseitig verwenden (liest Redis-Zugangsdaten)
import { getDeals, isPriceFresh, type Deal } from "@/lib/deals";
import { getJSON, setJSON, storeConfigured } from "@/lib/store";

export const AUTO_DEALS_KEY = "deals:auto";

/** Vom Autopiloten gefundene Deals (nur solche mit Preis jünger als 24 h). */
export async function getAutoDeals(): Promise<Deal[]> {
  if (!storeConfigured()) return [];
  try {
    const list = (await getJSON<Deal[]>(AUTO_DEALS_KEY)) ?? [];
    const now = Date.now();
    return list.filter((d) => isPriceFresh(d, now));
  } catch (e) {
    console.error("[deals] Autopilot-Deals nicht lesbar:", e);
    return [];
  }
}

export async function saveAutoDeals(deals: Deal[]): Promise<void> {
  await setJSON(AUTO_DEALS_KEY, deals);
}

/** Manuelle Deals (Top-Deals zuerst) + neueste Autopilot-Deals. */
export async function getAllDeals(): Promise<Deal[]> {
  const manual = getDeals();
  const manualAsins = new Set(manual.map((d) => d.asin));
  const auto = (await getAutoDeals())
    .filter((d) => !manualAsins.has(d.asin))
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  const featured = manual.filter((d) => d.featured);
  const rest = manual.filter((d) => !d.featured);
  return [...featured, ...auto, ...rest];
}

export async function findDeal(id: string): Promise<Deal | undefined> {
  return (await getAllDeals()).find((d) => d.id === id);
}
