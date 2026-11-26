// Advisors månadsrapport: hur månaden går mot målet (försäljning 14 000–17 000 kr och 37 % vinstmarginal).
// Bygger på plaggen som sålts under månaden (pris minus hemkostnad), inte på bokföringen, så att
// marginalen blir per plagg. Rena beräkningar, pengar i ören.
import { daysInMonth, prevMonth } from './dates';
import { allLanded, isSold } from './metrics';
import type { Dataset, ISODate, Ore } from './types';

export const DEFAULT_GOAL = { min: 1400000, max: 1700000, marginPct: 37 };

export function monthGoal(ds: Dataset) {
  return {
    min: ds.settings.monthGoalMin ?? DEFAULT_GOAL.min,
    max: ds.settings.monthGoalMax ?? DEFAULT_GOAL.max,
    marginPct: ds.settings.marginGoalPct ?? DEFAULT_GOAL.marginPct,
  };
}

export interface MonthFigures {
  month: string; // YYYY-MM
  sold: number;
  revenue: Ore;
  cost: Ore;
  profit: Ore;
  /** Vinst delat med försäljning, i procent (0 om inget sålts) */
  marginPct: number;
}

export function monthFigures(ds: Dataset, month: string): MonthFigures {
  let sold = 0,
    revenue = 0,
    cost = 0;
  for (const l of allLanded(ds)) {
    if (!isSold(l.item) || !(l.item.saleDate ?? '').startsWith(month)) continue;
    sold++;
    revenue += l.item.salePrice;
    cost += l.landed;
  }
  const profit = revenue - cost;
  return { month, sold, revenue, cost, profit, marginPct: revenue ? Math.round((profit / revenue) * 1000) / 10 : 0 };
}

export type GoalStatus = 'under' | 'inom' | 'över';

export interface MonthReport extends MonthFigures {
  goal: { min: Ore; max: Ore; marginPct: number };
  /** Hur många dagar av månaden som gått (hela månaden om den är slut) */
  daysPassed: number;
  daysTotal: number;
  /** Om takten håller: försäljning vid månadens slut. Samma som revenue för en avslutad månad. */
  projected: Ore;
  revenueStatus: GoalStatus;
  marginStatus: 'under' | 'nådd';
  /** Hur mycket som saknas till golvet (14 000 kr), 0 om nått */
  toMin: Ore;
  /** De sex senaste månaderna inklusive denna, äldst först */
  trend: MonthFigures[];
  /** Snittet för de fem månaderna före denna */
  avgBefore: { revenue: Ore; marginPct: number };
  lines: string[];
}

const kr = (o: Ore) => `${Math.round(o / 100).toLocaleString('sv-SE')} kr`;

export function monthReport(ds: Dataset, month: string, today: ISODate): MonthReport {
  const f = monthFigures(ds, month);
  const goal = monthGoal(ds);
  const total = daysInMonth(month);
  const current = today.startsWith(month);
  const passed = current ? +today.slice(8, 10) : total;
  const projected = current && passed < total ? Math.round(f.revenue / passed) * total : f.revenue;
  const judgeOn = projected;
  const revenueStatus: GoalStatus = judgeOn < goal.min ? 'under' : judgeOn > goal.max ? 'över' : 'inom';
  const marginStatus = f.marginPct >= goal.marginPct ? 'nådd' : 'under';
  const months: string[] = [month];
  for (let i = 0; i < 5; i++) months.unshift(prevMonth(months[0]));
  const trend = months.map((m) => (m === month ? f : monthFigures(ds, m)));
  const before = trend.slice(0, -1).filter((x) => x.sold > 0);
  const avgBefore = {
    revenue: before.length ? Math.round(before.reduce((s, x) => s + x.revenue, 0) / before.length) : 0,
    marginPct: before.length ? Math.round((before.reduce((s, x) => s + x.marginPct, 0) / before.length) * 10) / 10 : 0,
  };
  const lines: string[] = [];
  if (current && passed < total)
    lines.push(
      `${kr(f.revenue)} sålt på ${passed} dagar. Håller takten blir det ${kr(projected)}, ${revenueStatus === 'under' ? `under målet (${kr(goal.min)})` : revenueStatus === 'över' ? 'över målet' : 'inom målet'}.`,
    );
  else lines.push(`${kr(f.revenue)} sålt, ${revenueStatus === 'under' ? `under målet (${kr(goal.min)})` : revenueStatus === 'över' ? `över målet (${kr(goal.max)})` : 'inom målet'}.`);
  if (f.sold) lines.push(`Vinstmarginal ${f.marginPct.toLocaleString('sv-SE')} %, ${marginStatus === 'nådd' ? 'över' : 'under'} målet ${goal.marginPct} %.`);
  if (current && revenueStatus === 'under' && passed < total && f.sold) {
    const need = goal.min - f.revenue;
    const avg = f.revenue / f.sold;
    lines.push(`Det saknas ${kr(need)}, ungefär ${Math.ceil(need / avg)} plagg till med ditt snittpris på ${kr(avg)}.`);
  }
  if (avgBefore.revenue) lines.push(`Snittet de senaste månaderna: ${kr(avgBefore.revenue)} och ${avgBefore.marginPct.toLocaleString('sv-SE')} % marginal.`);
  return {
    ...f,
    goal,
    daysPassed: passed,
    daysTotal: total,
    projected,
    revenueStatus,
    marginStatus,
    toMin: Math.max(0, goal.min - f.revenue),
    trend,
    avgBefore,
    lines,
  };
}
