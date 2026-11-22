import { inferBrand } from './doorzo';
import { allLanded, isSold, periodPL, type LandedItem } from './metrics';
import type { Dataset, ISODate } from './types';

export interface Quarter {
  year: number;
  q: 1 | 2 | 3 | 4;
}

export const quarterOf = (d: ISODate): Quarter => ({ year: +d.slice(0, 4), q: (Math.floor((+d.slice(5, 7) - 1) / 3) + 1) as Quarter['q'] });
export const quarterLabel = (q: Quarter) => `Q${q.q} ${q.year}`;
export const prevQuarter = (q: Quarter): Quarter => (q.q === 1 ? { year: q.year - 1, q: 4 } : { year: q.year, q: (q.q - 1) as Quarter['q'] });
export function quarterRange(q: Quarter): { from: ISODate; to: ISODate } {
  const m0 = (q.q - 1) * 3 + 1;
  const last = new Date(q.year, m0 + 2, 0).getDate();
  return { from: `${q.year}-${String(m0).padStart(2, '0')}-01`, to: `${q.year}-${String(m0 + 2).padStart(2, '0')}-${last}` };
}
const inQ = (d: string | null | undefined, q: Quarter) => {
  if (!d) return false;
  const r = quarterRange(q);
  return d >= r.from && d <= r.to;
};

export interface Group {
  key: string;
  sold: number;
  revenue: number;
  profit: number;
  margin: number; // vinst / omsättning %
  roi: number; // vinst / hemkostnad %
  bought: number; // köpta i kvartalet
  sellThrough: number | null; // andel sålda av alla plagg i gruppen (alla tider)
}

function group(L: LandedItem[], q: Quarter, keyOf: (l: LandedItem) => string): Group[] {
  const m = new Map<string, { sold: number; revenue: number; profit: number; landed: number; bought: number; all: number; allSold: number }>();
  for (const l of L) {
    const k = keyOf(l);
    if (!k) continue;
    const g = m.get(k) ?? { sold: 0, revenue: 0, profit: 0, landed: 0, bought: 0, all: 0, allSold: 0 };
    g.all++;
    if (isSold(l.item)) g.allSold++;
    if (inQ(l.drop.date, q)) g.bought++;
    if (isSold(l.item) && inQ(l.item.saleDate, q)) {
      g.sold++;
      g.revenue += l.item.salePrice;
      g.profit += l.profit ?? 0;
      g.landed += l.landed;
    }
    m.set(k, g);
  }
  return [...m]
    .map(([key, g]) => ({
      key,
      sold: g.sold,
      revenue: g.revenue,
      profit: g.profit,
      margin: g.revenue ? (g.profit / g.revenue) * 100 : 0,
      roi: g.landed ? (g.profit / g.landed) * 100 : 0,
      bought: g.bought,
      sellThrough: g.all >= 3 ? g.allSold / g.all : null,
    }))
    .filter((g) => g.sold > 0 || g.bought > 0)
    .sort((a, b) => b.profit - a.profit);
}

const COST_BUCKETS = [
  { label: 'Under 100 kr', max: 10000 },
  { label: '100–199 kr', max: 20000 },
  { label: '200–299 kr', max: 30000 },
  { label: '300–499 kr', max: 50000 },
  { label: '500 kr eller mer', max: Infinity },
];

/** Storlek för jeans/byxor som W-mått, annars storleken som den står. */
function sizeKey(l: LandedItem): string {
  const s = l.item.size.trim().toUpperCase();
  if (!s) return '';
  const w = s.match(/W?\s?(\d{2})\b/);
  if ((l.item.category === 'Jeans' || l.item.category === 'Byxor') && w) return `W${w[1]}`;
  return s.replace(/\s+/g, '');
}

export interface QuarterReport {
  quarter: Quarter;
  revenue: number;
  costs: number;
  result: number;
  soldCount: number;
  soldRevenue: number;
  soldProfit: number;
  margin: number;
  prev: { revenue: number; result: number; soldCount: number };
  stockValueEnd: number;
  unsoldEnd: number;
  brands: Group[];
  categories: Group[];
  sizes: Group[];
  costBuckets: Group[];
  buyMore: string[];
  buyLess: string[];
  notes: string[];
}

export function quarterReport(ds: Dataset, q: Quarter): QuarterReport {
  const L = allLanded(ds);
  const r = quarterRange(q);
  const months = [0, 1, 2].map((i) => `${q.year}-${String((q.q - 1) * 3 + 1 + i).padStart(2, '0')}`);
  const pl = months.map((m) => periodPL(ds.vouchers, m)).reduce((a, b) => ({ revenue: a.revenue + b.revenue, costs: a.costs + b.costs }), { revenue: 0, costs: 0 });
  const pq = prevQuarter(q);
  const ppl = [0, 1, 2]
    .map((i) => periodPL(ds.vouchers, `${pq.year}-${String((pq.q - 1) * 3 + 1 + i).padStart(2, '0')}`))
    .reduce((a, b) => ({ revenue: a.revenue + b.revenue, costs: a.costs + b.costs }), { revenue: 0, costs: 0 });
  const sold = L.filter((l) => isSold(l.item) && inQ(l.item.saleDate, q));
  const prevSold = L.filter((l) => isSold(l.item) && inQ(l.item.saleDate, pq)).length;
  // Lager vid kvartalets slut: köpt senast då, osålt eller sålt efter
  const stock = L.filter((l) => l.drop.date <= r.to && (!isSold(l.item) || (l.item.saleDate ?? '') > r.to));
  const soldRevenue = sold.reduce((s, l) => s + l.item.salePrice, 0);
  const soldProfit = sold.reduce((s, l) => s + (l.profit ?? 0), 0);

  const brands = group(L, q, (l) => l.item.brand.trim() ? inferBrand(l.item.brand) || l.item.brand.trim() : inferBrand(l.item.name) || 'Okänt märke');
  const categories = group(L, q, (l) => l.item.category);
  const sizes = group(L, q, sizeKey);
  const costBuckets = group(L, q, (l) => COST_BUCKETS.find((b) => l.item.cost < b.max)!.label).sort(
    (a, b) => COST_BUCKETS.findIndex((x) => x.label === a.key) - COST_BUCKETS.findIndex((x) => x.label === b.key),
  );

  // Regelbaserade rekommendationer: minst 3 sålda för att räknas
  const avgMargin = soldRevenue ? (soldProfit / soldRevenue) * 100 : 0;
  const buyMore: string[] = [];
  const buyLess: string[] = [];
  for (const g of [...brands, ...categories]) {
    if (g.sold < 3 || g.key === 'Okänt märke') continue;
    const st = g.sellThrough;
    if (g.margin >= avgMargin + 5 && (st === null || st >= 0.7)) buyMore.push(`${g.key}: ${Math.round(g.margin)} % marginal, ${g.sold} sålda${st !== null ? `, ${Math.round(st * 100)} % av alla har sålts` : ''}`);
    else if (g.margin < avgMargin - 10 || (st !== null && st < 0.5)) buyLess.push(`${g.key}: ${Math.round(g.margin)} % marginal${st !== null ? `, bara ${Math.round(st * 100)} % har sålts` : ''}`);
  }
  const bestBucket = costBuckets.filter((b) => b.sold >= 3).sort((a, b) => b.roi - a.roi)[0];
  const notes: string[] = [];
  if (bestBucket) notes.push(`Bäst avkastning på plagg köpta för ${bestBucket.key.toLowerCase()}: ${Math.round(bestBucket.roi)} % ROI.`);
  const bestSize = sizes.filter((s) => s.sold >= 3).sort((a, b) => b.sold - a.sold)[0];
  if (bestSize) notes.push(`Mest sålda storlek: ${bestSize.key} (${bestSize.sold} st).`);
  if (prevSold) notes.push(`${sold.length >= prevSold ? 'Fler' : 'Färre'} sålda än förra kvartalet (${sold.length} mot ${prevSold}).`);
  const old = stock.filter((l) => (new Date(`${r.to}T12:00:00`).getTime() - new Date(`${l.drop.date}T12:00:00`).getTime()) / 86400000 > 90);
  if (old.length) notes.push(`${old.length} plagg i lagret var äldre än 90 dagar vid kvartalets slut.`);

  return {
    quarter: q,
    revenue: pl.revenue,
    costs: pl.costs,
    result: pl.revenue - pl.costs,
    soldCount: sold.length,
    soldRevenue,
    soldProfit,
    margin: avgMargin,
    prev: { revenue: ppl.revenue, result: ppl.revenue - ppl.costs, soldCount: prevSold },
    stockValueEnd: stock.reduce((s, l) => s + l.landed, 0),
    unsoldEnd: stock.length,
    brands,
    categories,
    sizes,
    costBuckets,
    buyMore,
    buyLess,
    notes,
  };
}
