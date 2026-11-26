// Planners mall för varje drop: planen sparas innan dropen köps och jämförs sedan med hur det faktiskt gick.
// Rena beräkningar, inga AI-anrop. Pengar i ören.
import { addDays, daysBetween } from './dates';
import { growthBudget } from './season';
import { dropStats, isSold, itemsOfDrop, landedForDrop, live } from './metrics';
import type { Dataset, Drop, DropPlan, ISODate, Ore } from './types';

/** Andel av en drops plagg som sålts inom n dagar från dropens datum. */
export function soldWithin(ds: Dataset, drop: Drop, days: number): number {
  const items = itemsOfDrop(ds, drop.id);
  if (!items.length) return 0;
  const limit = addDays(drop.date, days);
  return items.filter((i) => isSold(i) && i.saleDate && i.saleDate <= limit).length / items.length;
}

/**
 * Förslag på plan för nästa drop, byggt på de senaste droppen: budget från tillväxtregeln (Planering),
 * antal från snittkostnaden hem, försäljning från snittpriset och säljtakt från hur droppen sålt.
 */
export function suggestPlan(ds: Dataset, today: ISODate): DropPlan {
  const g = growthBudget(ds, today);
  const old = live(ds.drops)
    .filter((d) => d.date <= today && daysBetween(d.date, today) >= 30)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3);
  let cost = 0,
    n = 0,
    rev = 0,
    soldN = 0;
  for (const d of live(ds.drops).filter((d) => d.date <= today).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3)) {
    const st = dropStats(ds, d);
    cost += st.cost;
    n += st.count;
    rev += st.revenue;
    soldN += st.sold;
  }
  const avgCost = n ? cost / n : 0;
  const avgSale = soldN ? rev / soldN : 0;
  const budget = g.suggested;
  const count = avgCost ? Math.max(1, Math.round(budget / avgCost)) : 0;
  const avg = (f: (d: Drop) => number, fallback: number) => (old.length ? old.reduce((s, d) => s + f(d), 0) / old.length : fallback);
  const sold30 = round2(avg((d) => soldWithin(ds, d, 30), 0.4));
  const sold60 = round2(Math.max(sold30, avg((d) => soldWithin(ds, d, 60), 0.65)));
  return { count, budget, expectedRevenue: Math.round((count * avgSale) / 100) * 100, sold30, sold60, madeAt: today, note: '' };
}

const round2 = (x: number) => Math.round(x * 100) / 100;

export type Verdict = 'bättre' | 'enligt plan' | 'sämre' | 'för tidigt';

export interface PlanRow {
  label: string;
  plan: number;
  actual: number | null;
  unit: 'kr' | 'st' | '%';
  verdict: Verdict;
  /** Kort förklaring, t.ex. "dropen är 12 dagar gammal" */
  note?: string;
}

export interface PlanVsActual {
  rows: PlanRow[];
  daysOld: number;
  /** En mening om hur det går totalt */
  summary: string;
}

/** Inom 5 % räknas som enligt plan. higherIsBetter styr åt vilket håll som är bra. */
function judge(plan: number, actual: number, higherIsBetter: boolean): Verdict {
  if (!plan) return 'enligt plan';
  const r = actual / plan;
  if (Math.abs(r - 1) <= 0.05) return 'enligt plan';
  return r > 1 === higherIsBetter ? 'bättre' : 'sämre';
}

/** Jämför dropens plan med utfallet hittills. */
export function planVsActual(ds: Dataset, drop: Drop, today: ISODate): PlanVsActual | null {
  const p = drop.plan;
  if (!p) return null;
  const st = dropStats(ds, drop);
  const daysOld = Math.max(0, daysBetween(drop.date, today));
  const profitPlan = p.expectedRevenue - p.budget;
  const L = landedForDrop(drop, itemsOfDrop(ds, drop.id), ds.settings.packaging);
  const soldCost = L.filter((l) => isSold(l.item)).reduce((s, l) => s + l.landed, 0);
  const rows: PlanRow[] = [
    { label: 'Antal plagg', plan: p.count, actual: st.count, unit: 'st', verdict: judge(p.count, st.count, true) },
    { label: 'Kostnad hem', plan: p.budget, actual: st.cost, unit: 'kr', verdict: judge(p.budget, st.cost, false) },
  ];
  const at = (days: number, share: number, label: string): PlanRow =>
    daysOld < days
      ? { label, plan: Math.round(share * 100), actual: null, unit: '%', verdict: 'för tidigt', note: `om ${days - daysOld} dagar` }
      : (() => {
          const a = Math.round(soldWithin(ds, drop, days) * 100);
          return { label, plan: Math.round(share * 100), actual: a, unit: '%', verdict: judge(share * 100, a, true) };
        })();
  rows.push(at(30, p.sold30, 'Sålt efter 30 dagar'), at(60, p.sold60, 'Sålt efter 60 dagar'));
  // Försäljning: jämför med planen i proportion till hur mycket som sålts, så att en halvsåld drop inte ser dålig ut
  const expectedSoFar = st.count && st.sold ? Math.round((p.expectedRevenue / Math.max(1, p.count)) * st.sold) : 0;
  rows.push({
    label: 'Snittpris sålda',
    plan: p.count ? Math.round(p.expectedRevenue / p.count) : 0,
    actual: st.sold ? Math.round(st.revenue / st.sold) : null,
    unit: 'kr',
    verdict: st.sold ? judge(expectedSoFar, st.revenue, true) : 'för tidigt',
  });
  rows.push({
    label: 'Vinst hittills',
    plan: profitPlan,
    actual: st.revenue - soldCost,
    unit: 'kr',
    verdict: st.sold === st.count && st.count ? judge(profitPlan, st.revenue - st.cost, true) : 'för tidigt',
    note: st.sold < st.count ? `${st.sold} av ${st.count} sålda` : undefined,
  });
  const judged = rows.filter((r) => r.verdict !== 'för tidigt');
  const worse = judged.filter((r) => r.verdict === 'sämre').length;
  const better = judged.filter((r) => r.verdict === 'bättre').length;
  const summary = !judged.length
    ? 'För tidigt att säga hur dropen går mot planen.'
    : worse > better
      ? `Sämre än planen på ${worse} av ${judged.length} punkter.`
      : better > worse
        ? `Bättre än planen på ${better} av ${judged.length} punkter.`
        : 'Ungefär enligt planen.';
  return { rows, daysOld, summary };
}

/** Planen i öre-belopp för visning i UI. */
export const planTotalProfit = (p: DropPlan): Ore => p.expectedRevenue - p.budget;
