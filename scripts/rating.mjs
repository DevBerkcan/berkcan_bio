/**
 * Deal-Bewertung für Bot, Kurator und Webseite:
 *   🔥 Hot Deal    – sehr starker Preis (hoher Rabatt oder sehr beliebt)
 *   👍 Guter Deal  – klar unter dem Normalpreis bzw. beliebt
 *   👌 Solider Deal – in Ordnung, fairer Preis
 *
 * Grundlage: Rabatt in % (Preis vs. Vergleichspreis) und – falls vorhanden –
 * die mydealz-Temperatur (Community-Bewertung in °).
 */
export const RATINGS = {
  hot: { key: "hot", label: "Hot Deal", emoji: "🔥", rank: 3 },
  good: { key: "good", label: "Guter Deal", emoji: "👍", rank: 2 },
  ok: { key: "ok", label: "Solider Deal", emoji: "👌", rank: 1 },
};

export function discountOf(deal) {
  const { price, oldPrice } = deal ?? {};
  if (!price || !oldPrice || oldPrice <= price) return 0;
  return Math.round((1 - price / oldPrice) * 100);
}

/** Bewertung eines Deals ({ price, oldPrice, temperature }). */
export function rateDeal(deal) {
  const pct = discountOf(deal);
  const temp = Number(deal?.temperature ?? 0);
  if (pct >= 40 || temp >= 300 || (pct >= 30 && temp >= 150)) return RATINGS.hot;
  if (pct >= 20 || temp >= 100) return RATINGS.good;
  return RATINGS.ok;
}

/** Sortier-Wert: Bewertung zuerst, dann Rabatt, dann Temperatur. */
export function dealScore(deal) {
  return rateDeal(deal).rank * 10000 + discountOf(deal) * 10 + Math.min(Number(deal?.temperature ?? 0), 999) / 100;
}

/** Temperatur aus einem alten Untertitel wie "🔥 245° bei mydealz" lesen. */
export function temperatureFromSubtitle(subtitle = "") {
  const m = String(subtitle).match(/(-?\d+)°/);
  return m ? Number(m[1]) : undefined;
}
