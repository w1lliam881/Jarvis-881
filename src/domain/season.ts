// Säsong för inköp och hur stor nästa drop bör vara.
// Allt här är regler, inga AI-anrop. Används av Planering (Framtid) och av agenterna Advisor och Planner.
import { addDays, daysBetween } from './dates';
import { dropStats, live } from './metrics';
import type { Category, Dataset, ISODate, Ore } from './types';

export type Season = 'vinter' | 'vår' | 'sommar' | 'höst';

export const SEASON_LABEL: Record<Season, string> = { vinter: 'Vinter', vår: 'Vår', sommar: 'Sommar', höst: 'Höst' };

/** Säsong för ett datum: dec–feb vinter, mars–maj vår, juni–aug sommar, sep–nov höst. */
export function seasonOf(d: ISODate): Season {
  const m = +d.slice(5, 7);
  if (m === 12 || m <= 2) return 'vinter';
  if (m <= 5) return 'vår';
  if (m <= 8) return 'sommar';
  return 'höst';
}

/**
 * Säsongen som ett inköp idag säljs i. Plaggen kommer om några veckor och säljs veckorna efter,
 * så vi tittar ungefär en månad framåt (leverans + halva täckningstiden). 25 november → vinter.
 */
export function buyingSeason(today: ISODate, leadWeeks = 3, coverWeeks = 4): Season {
  return seasonOf(addDays(today, Math.round((leadWeeks + coverWeeks / 2) * 7)));
}

/**
 * Hur mycket mer (över 1) eller mindre (under 1) av en kategori som bör köpas in en viss säsong,
 * jämfört med vad historiken säger. Medvetet försiktiga tal: historiken väger fortfarande tyngst.
 */
export const SEASON_WEIGHT: Record<Season, Record<Category, number>> = {
  vinter: { Jeans: 1.25, Jackor: 1.6, Tröjor: 1.4, 'T-shirts': 0.4, Skjortor: 0.8, Byxor: 1.0, Skor: 1.1, Övrigt: 0.8 },
  vår: { Jeans: 1.2, Jackor: 1.0, Tröjor: 0.9, 'T-shirts': 1.0, Skjortor: 1.2, Byxor: 1.1, Skor: 1.0, Övrigt: 1.0 },
  sommar: { Jeans: 0.9, Jackor: 0.5, Tröjor: 0.6, 'T-shirts': 1.6, Skjortor: 1.3, Byxor: 1.0, Skor: 1.0, Övrigt: 1.1 },
  höst: { Jeans: 1.25, Jackor: 1.35, Tröjor: 1.25, 'T-shirts': 0.6, Skjortor: 1.0, Byxor: 1.0, Skor: 1.0, Övrigt: 0.9 },
};

/** Kort text om vad säsongen betyder för inköpen. */
export const SEASON_TIP: Record<Season, string> = {
  vinter: 'Vinter: mer jeans, jackor och tjocka tröjor. Färre t-shirts. Mörka tvättar och raw denim säljer bättre.',
  vår: 'Vår: jeans och skjortor, lättare jackor (denimjackor). Börja ta in några t-shirts.',
  sommar: 'Sommar: t-shirts, skjortor och ljusa jeans. Få jackor och tjocka tröjor.',
  höst: 'Höst: jeans, jackor och tröjor ökar. Färre t-shirts.',
};

/** Fördelning med säsongen inräknad. weights = historikens vikter per kategori (summa spelar ingen roll). */
export function seasonalShares(weights: Partial<Record<Category, number>>, s: Season): Partial<Record<Category, number>> {
  const out: Partial<Record<Category, number>> = {};
  let sum = 0;
  for (const [k, w] of Object.entries(weights) as [Category, number][]) {
    const v = Math.max(0, w) * SEASON_WEIGHT[s][k];
    out[k] = v;
    sum += v;
  }
  for (const k of Object.keys(out) as Category[]) out[k] = sum ? out[k]! / sum : 0;
  return out;
}

// ---------- Nästa drops storlek ----------

export interface DropSize {
  name: string;
  date: ISODate;
  count: number;
  cost: Ore;
  sold: number;
  sellThrough: number;
  daysOld: number;
}

export interface GrowthBudget {
  /** De senaste droppen (högst 3), nyast först. */
  recent: DropSize[];
  /** Den senaste droppens totala kostnad (inköp + frakt + tull + förpackning). */
  lastCost: Ore;
  /** Föreslagen tillväxt i procent (kan vara negativ). */
  growthPct: number;
  /** Föreslagen total kostnad för nästa drop, avrundad till 100 kr. */
  suggested: Ore;
  /** Tak som aldrig passeras: 80 % av din satta budget, så att det alltid finns en buffert. */
  cap: Ore | null;
  /** Det som sparas som buffert om förslaget följs (bara när budget är satt). */
  reserve: Ore | null;
  reasons: string[];
}

const round100 = (o: Ore) => Math.round(o / 10000) * 10000;

/**
 * Föreslår hur stor nästa drop bör vara: lite större än den senaste om den sålt bra, lika stor om den
 * säljer långsamt och mindre om den säljer dåligt. Aldrig mer än 80 % av satt budget.
 * Sälj-takten bedöms i förhållande till hur gammal dropen är, så en ny drop straffas inte.
 */
export function growthBudget(ds: Dataset, today: ISODate): GrowthBudget {
  const drops = live(ds.drops)
    .filter((d) => d.date <= today)
    .map((d) => {
      const st = dropStats(ds, d);
      return { name: d.name, date: d.date, count: st.count, cost: st.cost, sold: st.sold, sellThrough: st.count ? st.sold / st.count : 0, daysOld: daysBetween(d.date, today) } satisfies DropSize;
    })
    .filter((d) => d.count > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3);
  const reasons: string[] = [];
  const budget = ds.settings.budget > 0 ? ds.settings.budget : null;
  const cap = budget ? Math.round(budget * 0.8) : null;
  if (!drops.length) {
    const suggested = cap ?? 0;
    if (cap) reasons.push('Ingen tidigare drop att jämföra med, så förslaget är 80 % av din budget.');
    else reasons.push('Ingen tidigare drop och ingen budget satt. Sätt en budget så kan jag föreslå en storlek.');
    return { recent: [], lastCost: 0, growthPct: 0, suggested, cap, reserve: budget && cap ? budget - suggested : null, reasons };
  }
  const last = drops[0];
  // Förväntad andel såld vid dropens ålder: ungefär 70 % efter 45 dagar, linjärt dit.
  const expected = Math.min(0.7, (Math.max(last.daysOld, 7) / 45) * 0.7);
  const pace = expected ? last.sellThrough / expected : 1;
  let growthPct: number;
  if (pace >= 1.1) growthPct = 15;
  else if (pace >= 0.85) growthPct = 10;
  else if (pace >= 0.6) growthPct = 0;
  else growthPct = -10;
  const pct = Math.round(last.sellThrough * 100);
  if (growthPct > 0) reasons.push(`Senaste dropen (${last.name}) har sålt ${pct} % på ${last.daysOld} dagar, snabbare än väntat. Väx med ${growthPct} %.`);
  else if (growthPct === 0) reasons.push(`Senaste dropen (${last.name}) har sålt ${pct} % på ${last.daysOld} dagar. Lite långsamt, så håll samma storlek.`);
  else reasons.push(`Senaste dropen (${last.name}) har bara sålt ${pct} % på ${last.daysOld} dagar. Gör nästa lite mindre tills lagret rör sig.`);
  // Bygg på den största av de senaste droppen om den senaste var ovanligt liten (men aldrig mer än 1,5 × den senaste)
  const biggest = Math.max(...drops.map((d) => d.cost));
  const base = Math.min(biggest, Math.round(last.cost * 1.5));
  if (base > last.cost) reasons.push('Utgår från en av de större droppen den senaste tiden, eftersom den senaste var mindre än vanligt.');
  let suggested = round100(base * (1 + growthPct / 100));
  if (cap != null && suggested > cap) {
    suggested = Math.floor(cap / 10000) * 10000;
    reasons.push('Begränsad till 80 % av din budget så att 20 % finns kvar som buffert.');
  }
  return { recent: drops, lastCost: last.cost, growthPct, suggested, cap, reserve: budget != null ? budget - suggested : null, reasons };
}

// ---------- Utseende: vinter- och jultema i Agentbyn ----------

export type ThemePref = 'auto' | 'på' | 'av';

export interface VillageTheme {
  /** Snö på marken, taken och träden, frusen damm. */
  winter: boolean;
  /** Julgran, ljusslingor, kransar och tomteluvor. */
  xmas: boolean;
}

/**
 * Auto: vinter 15 nov–28 feb och jul 20 nov–6 jan. "på" tvingar båda, "av" stänger av allt.
 */
export function villageTheme(today: ISODate, pref: ThemePref = 'auto'): VillageTheme {
  if (pref === 'av') return { winter: false, xmas: false };
  if (pref === 'på') return { winter: true, xmas: true };
  const md = today.slice(5);
  const winter = md >= '11-15' || md <= '02-28' || md === '02-29';
  const xmas = md >= '11-20' || md <= '01-06';
  return { winter, xmas };
}

/** Snöar det just nu? Lite grann ibland: 18 av varje 30 minuter, inte hela tiden. */
export function snowingAt(h: number, m: number): boolean {
  return (h * 60 + m) % 30 < 18;
}
