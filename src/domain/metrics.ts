import { allocate } from './money';
import { daysBetween, monthOf } from './dates';
import type { Category, Dataset, Drop, ISODate, Item, Ore, Voucher } from './types';

export const live = <T extends { deletedAt?: string | null }>(xs: T[]): T[] => xs.filter((x) => !x.deletedAt);

export const isSold = (i: Item): boolean => i.salePrice > 0 && !i.returnedAt;

export interface LandedItem {
  item: Item;
  drop: Drop;
  shippingShare: Ore;
  customsShare: Ore;
  packaging: Ore;
  /** Hemkostnad = inköp + andel frakt + andel tull + förpackning */
  landed: Ore;
  profit: Ore | null;
}

/**
 * Hemkostnad per plagg i en drop.
 * Frakt fördelas på vikt (lika om vikt saknas helt), tull på inköpsvärde (lika om inköpsvärde saknas).
 * Fördelningen sker i hela ören så att summan alltid stämmer exakt.
 */
export function landedForDrop(drop: Drop, items: Item[], packaging: Ore): LandedItem[] {
  const ship = allocate(drop.shipping, items.map((i) => i.weightKg));
  const cust = allocate(drop.customs, items.map((i) => i.cost));
  return items.map((item, k) => {
    const landed = item.cost + ship[k] + cust[k] + packaging;
    return {
      item,
      drop,
      shippingShare: ship[k],
      customsShare: cust[k],
      packaging,
      landed,
      profit: isSold(item) ? item.salePrice - landed : null,
    };
  });
}

export function itemsOfDrop(ds: Dataset, dropId: string): Item[] {
  return ds.items.filter((i) => i.dropId === dropId && !i.deletedAt);
}

/** Alla plagg med hemkostnad. Cachas per dataset-objekt. */
const landedCache = new WeakMap<Dataset, LandedItem[]>();
export function allLanded(ds: Dataset): LandedItem[] {
  const hit = landedCache.get(ds);
  if (hit) return hit;
  const out: LandedItem[] = [];
  for (const d of live(ds.drops)) out.push(...landedForDrop(d, itemsOfDrop(ds, d.id), ds.settings.packaging));
  landedCache.set(ds, out);
  return out;
}

export function landedOf(ds: Dataset, itemId: string): LandedItem | undefined {
  return allLanded(ds).find((l) => l.item.id === itemId);
}

export interface DropStats {
  drop: Drop;
  count: number;
  sold: number;
  purchase: Ore;
  /** Total kostnad = inköp + frakt + tull + förpackning */
  cost: Ore;
  revenue: Ore;
  result: Ore;
  roi: number; // procent
  avgSale: Ore;
  breakEven: number | null;
  unsoldCost: Ore;
  totalWeight: number;
}

export function dropStats(ds: Dataset, drop: Drop): DropStats {
  const L = landedForDrop(drop, itemsOfDrop(ds, drop.id), ds.settings.packaging);
  let purchase = 0,
    cost = 0,
    revenue = 0,
    sold = 0,
    unsoldCost = 0,
    w = 0;
  for (const l of L) {
    purchase += l.item.cost;
    cost += l.landed;
    w += l.item.weightKg;
    if (isSold(l.item)) {
      sold++;
      revenue += l.item.salePrice;
    } else unsoldCost += l.landed;
  }
  if (L.length === 0) cost = drop.shipping + drop.customs;
  const avgSale = sold ? Math.round(revenue / sold) : 0;
  return {
    drop,
    count: L.length,
    sold,
    purchase,
    cost,
    revenue,
    result: revenue - cost,
    roi: cost ? ((revenue - cost) / cost) * 100 : 0,
    avgSale,
    breakEven: avgSale ? Math.ceil(cost / avgSale) : null,
    unsoldCost,
    totalWeight: w,
  };
}

// ---------- Resultat från bokföringen ----------

export interface PL {
  revenue: Ore;
  costs: Ore;
  result: Ore;
  vat: Ore;
  byAccount: Record<number, Ore>;
}

/** Resultat för en period (prefix "2026", "2026-11" eller exakt datum) från verifikaten. */
export function periodPL(vouchers: Voucher[], prefix: string): PL {
  const o: PL = { revenue: 0, costs: 0, result: 0, vat: 0, byAccount: {} };
  for (const v of vouchers) {
    if (v.deletedAt || !v.date.startsWith(prefix)) continue;
    for (const l of v.lines) {
      if (l.account === 2610) o.vat += l.credit - l.debit;
      if (l.account === 2640) o.vat -= l.debit - l.credit;
      if (l.account < 3000) continue;
      const n = l.account < 4000 ? l.credit - l.debit : l.debit - l.credit;
      if (l.account < 4000) o.revenue += n;
      else o.costs += n;
      o.byAccount[l.account] = (o.byAccount[l.account] ?? 0) + n;
    }
  }
  o.result = o.revenue - o.costs;
  return o;
}

// ---------- Historik för kalkyl och framtid ----------

export interface CategoryHistory {
  n: number;
  sold: number;
  nOld: number;
  soldOld: number;
  revenue: Ore;
  profit: Ore;
  landed: Ore;
  weightSum: number;
  weightN: number;
}

export interface History {
  byCat: Partial<Record<Category, CategoryHistory>>;
  /** frakt per kg i ören, från drops med känd frakt och vikt */
  shippingPerKg: Ore | null;
  /** tull+moms som andel av (varuvärde + frakt) */
  customsRate: number | null;
  n: number;
  landed: Ore;
}

export function history(ds: Dataset, today: ISODate): History {
  const H: History = { byCat: {}, shippingPerKg: null, customsRate: null, n: 0, landed: 0 };
  let Fw = 0,
    Ww = 0,
    Tp = 0,
    Pp = 0;
  for (const d of live(ds.drops)) {
    const items = itemsOfDrop(ds, d.id);
    const L = landedForDrop(d, items, ds.settings.packaging);
    let W = 0,
      P = 0;
    for (const i of items) {
      W += i.weightKg;
      P += i.cost;
    }
    if (W > 0 && d.shipping > 0) {
      Fw += d.shipping;
      Ww += W;
    }
    if (P > 0 && d.shipping > 0 && d.customs > 0) {
      Tp += d.customs;
      Pp += P + d.shipping;
    }
    const old = daysBetween(d.date, today) > 45;
    for (const l of L) {
      const c = (H.byCat[l.item.category] ??= { n: 0, sold: 0, nOld: 0, soldOld: 0, revenue: 0, profit: 0, landed: 0, weightSum: 0, weightN: 0 });
      c.n++;
      c.landed += l.landed;
      H.n++;
      H.landed += l.landed;
      if (old) {
        c.nOld++;
        if (isSold(l.item)) c.soldOld++;
      }
      if (l.item.weightKg > 0) {
        c.weightSum += l.item.weightKg;
        c.weightN++;
      }
      if (isSold(l.item)) {
        c.sold++;
        c.revenue += l.item.salePrice;
        c.profit += l.item.salePrice - l.landed;
      }
    }
  }
  H.shippingPerKg = Ww > 0 ? Math.round(Fw / Ww) : null;
  H.customsRate = Pp > 0 ? Tp / Pp : null;
  return H;
}

// ---------- Lager ----------

export function stockAge(ds: Dataset, today: ISODate) {
  const buckets = [
    { label: '0–30 dagar', min: 0, max: 30 },
    { label: '31–60 dagar', min: 31, max: 60 },
    { label: '61–90 dagar', min: 61, max: 90 },
    { label: 'Över 90 dagar', min: 91, max: Infinity },
  ];
  const un = allLanded(ds).filter((l) => !isSold(l.item));
  return buckets.map((b) => {
    const l = un.filter((x) => {
      const a = daysBetween(x.drop.date, today);
      return a >= b.min && a <= b.max;
    });
    return { ...b, count: l.length, value: l.reduce((s, x) => s + x.landed, 0) };
  });
}

export function overview(ds: Dataset, today: ISODate) {
  const m = monthOf(today);
  const L = allLanded(ds);
  const soldMonth = L.filter((l) => isSold(l.item) && (l.item.saleDate ?? '').startsWith(m));
  const unsold = L.filter((l) => !isSold(l.item));
  const pl = periodPL(ds.vouchers, m);
  const old60 = unsold.filter((l) => daysBetween(l.drop.date, today) > 60);
  return {
    month: m,
    soldCount: soldMonth.length,
    soldRevenue: soldMonth.reduce((s, l) => s + l.item.salePrice, 0),
    soldProfit: soldMonth.reduce((s, l) => s + (l.profit ?? 0), 0),
    soldAfterPurchase: soldMonth.reduce((s, l) => s + l.item.salePrice - l.item.cost, 0),
    unsoldCount: unsold.length,
    stockValue: unsold.reduce((s, l) => s + l.landed, 0),
    old60Count: old60.length,
    pl,
    byCategoryUnsold: countBy(unsold.map((l) => l.item.category)),
  };
}

export function dailySales(ds: Dataset, month: string): number[] {
  const days = new Date(+month.slice(0, 4), +month.slice(5, 7), 0).getDate();
  const out = new Array(days).fill(0);
  for (const i of live(ds.items)) {
    if (isSold(i) && i.saleDate && i.saleDate.startsWith(month)) out[+i.saleDate.slice(8, 10) - 1] += i.salePrice;
  }
  return out;
}

export function countBy<T extends string>(xs: T[]): Record<T, number> {
  const o = {} as Record<T, number>;
  for (const x of xs) o[x] = (o[x] ?? 0) + 1;
  return o;
}
