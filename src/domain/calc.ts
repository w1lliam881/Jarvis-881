import { daysBetween } from './dates';
import { allLanded, history, isSold, type History } from './metrics';
import type { Category, Dataset, ISODate, Ore, Settings } from './types';

/** Standardvikt per kategori (kg) när historik saknas. Från v14. */
export const DEFAULT_WEIGHT: Record<Category, number> = {
  Jeans: 0.8,
  Jackor: 1.1,
  Tröjor: 0.5,
  'T-shirts': 0.25,
  Skjortor: 0.4,
  Byxor: 0.6,
  Skor: 1,
  Övrigt: 0.5,
};

export interface Rates {
  shippingPerKg: Ore;
  customsRate: number;
  learned: boolean;
}

/** Frakt per kg och tullsats: lärda från historiken om den finns, annars från inställningarna. */
export function rates(H: History, s: Settings): Rates {
  return {
    shippingPerKg: H.shippingPerKg ?? s.shippingPerKg,
    customsRate: H.customsRate ?? s.customsRate,
    learned: H.shippingPerKg != null && H.customsRate != null,
  };
}

export function estWeight(H: History, k: Category): number {
  const c = H.byCat[k];
  return c && c.weightN ? c.weightSum / c.weightN : DEFAULT_WEIGHT[k];
}

export type Verdict = 'Köp' | 'Tveksam' | 'Avstå';

export interface CalcResult {
  weightKg: number;
  shipping: Ore;
  customs: Ore;
  packaging: Ore;
  landed: Ore;
  profit: Ore;
  roi: number;
  verdict: Verdict;
  reasons: string[];
  sellThrough: number | null;
  avgSale: Ore | null;
}

/** Kalkyl för ett Doorzo-plagg. Användaren anger själv sitt säljpris. */
export function evaluateCandidate(
  c: { category: Category; price: Ore; weightKg: number; plannedSalePrice: Ore },
  H: History,
  s: Settings,
): CalcResult {
  const R = rates(H, s);
  const w = c.weightKg > 0 ? c.weightKg : estWeight(H, c.category);
  const shipping = Math.round(w * R.shippingPerKg);
  const customs = Math.round(R.customsRate * (c.price + shipping));
  const landed = c.price + shipping + customs + s.packaging;
  const profit = c.plannedSalePrice - landed;
  const roi = landed ? (profit / landed) * 100 : 0;
  const h = H.byCat[c.category];
  const sellThrough = h && h.nOld >= 3 ? h.soldOld / h.nOld : null;
  const avgSale = h && h.sold >= 3 ? Math.round(h.revenue / h.sold) : null;
  const reasons: string[] = [];
  if (sellThrough !== null && sellThrough < 0.6) reasons.push(`Kategorin säljer bara ${Math.round(sellThrough * 100)} % av plaggen`);
  if (avgSale && c.plannedSalePrice > avgSale * 1.4)
    reasons.push(`Ditt säljpris är ${Math.round((c.plannedSalePrice / avgSale - 1) * 100)} % över ditt snitt i kategorin (${Math.round(avgSale / 100)} kr)`);
  if (roi < s.minRoiPct) reasons.push(`ROI ${Math.round(roi)} % är under ditt krav på ${s.minRoiPct} %`);
  if (profit < s.minProfit) reasons.push(`Vinsten är under ditt krav på ${Math.round(s.minProfit / 100)} kr`);
  let verdict: Verdict;
  if (roi >= s.minRoiPct && profit >= s.minProfit && (sellThrough === null || sellThrough >= 0.6)) verdict = 'Köp';
  else if (roi >= s.minRoiPct / 2 && profit > 0) verdict = 'Tveksam';
  else verdict = 'Avstå';
  if (verdict === 'Köp') reasons.push(H.n ? 'Uppfyller dina krav enligt din historik' : 'Uppfyller dina krav, men bygger på uppskattningar');
  return { weightKg: w, shipping, customs, packaging: s.packaging, landed, profit, roi, verdict, reasons, sellThrough, avgSale };
}

// ---------- Maxpris per kategori ----------

export interface MaxPrice {
  category: Category;
  avgSale: Ore;
  weightKg: number;
  shipping: Ore;
  /** Högsta inköpspris (före frakt och tull) som uppfyller både ROI- och vinstkrav. Null om omöjligt. */
  maxPrice: Ore | null;
  limitedBy: 'roi' | 'vinst';
  basis: number; // antal sålda som snittet bygger på
}

/**
 * hemkostnad = p + frakt + r·(p + frakt) + förpackning = (p + frakt)(1 + r) + förpackning
 * Krav: snitt − hemkostnad ≥ minVinst  och  (snitt − hemkostnad) / hemkostnad ≥ minROI
 * ⇒ hemkostnad ≤ min(snitt − minVinst, snitt / (1 + minROI))
 */
export function maxPriceFor(category: Category, H: History, s: Settings): MaxPrice | null {
  const h = H.byCat[category];
  if (!h || h.sold === 0) return null;
  const R = rates(H, s);
  const avgSale = Math.round(h.revenue / h.sold);
  const w = estWeight(H, category);
  const shipping = Math.round(w * R.shippingPerKg);
  const byProfit = avgSale - s.minProfit;
  const byRoi = avgSale / (1 + s.minRoiPct / 100);
  const landedMax = Math.min(byProfit, byRoi);
  const p = Math.floor((landedMax - s.packaging) / (1 + R.customsRate) - shipping);
  return { category, avgSale, weightKg: w, shipping, maxPrice: p > 0 ? p : null, limitedBy: byRoi <= byProfit ? 'roi' : 'vinst', basis: h.sold };
}

// ---------- Framtid: orderplan och budget ----------

export interface OrderPlanRow {
  category: Category;
  share: number;
  qty: number;
  budget: Ore;
  profitPerItem: Ore;
  expectedProfit: Ore;
  maxPrice: Ore | null;
}

export interface OrderPlan {
  salesPerWeek: number;
  stock: number;
  weeksOfStock: number;
  qty: number;
  orderBy: ISODate | 'nu';
  avgLanded: Ore;
  budget: Ore;
  expectedProfit: Ore;
  rows: OrderPlanRow[];
  fromBudget: boolean;
}

export function orderPlan(ds: Dataset, today: ISODate): OrderPlan {
  const s = ds.settings;
  const H = history(ds, today);
  const L = allLanded(ds);
  const saleDates = L.filter((l) => isSold(l.item) && l.item.saleDate).map((l) => l.item.saleDate!) as string[];
  const first = saleDates.length ? saleDates.reduce((a, b) => (a < b ? a : b)) : today;
  const window = saleDates.length ? Math.max(14, Math.min(90, daysBetween(first, today))) : 90;
  const recent = saleDates.filter((d) => daysBetween(d, today) < 90).length;
  const measured = recent / (window / 7);
  const perWeek = s.salesPerWeekOverride > 0 ? s.salesPerWeekOverride : measured;
  const stock = L.filter((l) => !isSold(l.item)).length;
  const weeksOfStock = perWeek ? stock / perWeek : 0;
  let qty = Math.max(0, Math.ceil(perWeek * (s.leadWeeks + s.coverWeeks) - stock));
  const orderByDays = Math.max(0, (weeksOfStock - s.leadWeeks) * 7);
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() + Math.round(orderByDays));
  const orderBy = weeksOfStock > s.leadWeeks ? d.toISOString().slice(0, 10) : 'nu';
  const avgLanded = H.n ? Math.round(H.landed / H.n) : 0;

  const cats = (Object.keys(H.byCat) as Category[]).filter((k) => (H.byCat[k]?.sold ?? 0) > 0 && k !== 'Skor');
  const weights = cats.map((k) => {
    const c = H.byCat[k]!;
    return (Math.max(c.profit, 0) * c.sold) / c.n;
  });
  const tw = weights.reduce((a, b) => a + b, 0);
  const fromBudget = s.budget > 0;
  if (fromBudget && avgLanded > 0) qty = Math.floor(s.budget / avgLanded);
  let expectedProfit = 0;
  const rows: OrderPlanRow[] = cats.map((k, i) => {
    const c = H.byCat[k]!;
    const share = tw ? weights[i] / tw : 1 / cats.length;
    const catLanded = Math.round(c.landed / c.n);
    const budget = fromBudget ? Math.round(s.budget * share) : 0;
    const n = fromBudget ? (catLanded ? Math.floor(budget / catLanded) : 0) : Math.round(qty * share);
    const profitPerItem = Math.round((c.revenue - c.landed) / c.n);
    expectedProfit += n * profitPerItem;
    return {
      category: k,
      share,
      qty: n,
      budget: fromBudget ? budget : n * catLanded,
      profitPerItem,
      expectedProfit: n * profitPerItem,
      maxPrice: maxPriceFor(k, H, s)?.maxPrice ?? null,
    };
  });
  const totalQty = rows.reduce((a, r) => a + r.qty, 0);
  return {
    salesPerWeek: perWeek,
    stock,
    weeksOfStock,
    qty: fromBudget ? totalQty : qty,
    orderBy,
    avgLanded,
    budget: fromBudget ? s.budget : qty * avgLanded,
    expectedProfit,
    rows,
    fromBudget,
  };
}
