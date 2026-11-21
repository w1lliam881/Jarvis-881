import { runChecks, healthScore } from '../domain/checks';
import { orderPlan, maxPriceFor } from '../domain/calc';
import { addDays, daysBetween, isoWeek, monthOf, prevMonth, todayISO, weekStart } from '../domain/dates';
import { findDuplicateSales, unlinkedSales } from '../domain/ledger';
import { allLanded, history, isSold, live, periodPL } from '../domain/metrics';
import type { Dataset, GameState, ISODate } from '../domain/types';

// ---------- Nivåer och världar ----------

/** Samma princip som v14 (level = floor(sqrt(xp/K)) + 1) men med K = 25 och världar som låses upp så att en värld tar 3–4 veckor. */
export const XP_K = 25;
export const levelOf = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / XP_K)) + 1;
export const xpForLevel = (lv: number) => XP_K * (lv - 1) * (lv - 1);

export interface World {
  id: string;
  name: string;
  unlockLevel: number;
  sky: string;
  ground: string;
  accent: string;
  title: string;
  boss: { id: string; name: string; goal: string };
  blurb: string;
}

export const WORLDS: World[] = [
  { id: 'skog', name: 'Mosskogen', unlockLevel: 1, sky: '#2E5E4E', ground: '#3E7B4F', accent: '#9EDBB8', title: 'Skogsvandrare', boss: { id: 'boss-skog', name: 'Bokföringsdraken', goal: 'Hälsopoäng 90 eller mer och inga allvarliga fel i Kontroll' }, blurb: 'Där allt börjar. Få ordning på grunden.' },
  { id: 'oken', name: 'Sandhavet', unlockLevel: 8, sky: '#C98B3E', ground: '#E3B66A', accent: '#FFE2A8', title: 'Ökenfarare', boss: { id: 'boss-oken', name: 'Ökenormen', goal: 'Logga statistik för 6 klipp under en och samma månad' }, blurb: 'Hetta och hägringar. Synas och höras.' },
  { id: 'frost', name: 'Frostriket', unlockLevel: 11, sky: '#5B7FA6', ground: '#DDE8F2', accent: '#BFE3FF', title: 'Isbrytare', boss: { id: 'boss-frost', name: 'Isjätten', goal: 'Sälj 20 plagg på en månad med minst 30 % marginal' }, blurb: 'Kallt och klart. Sälj smart.' },
  { id: 'vulkan', name: 'Glödbergen', unlockLevel: 13, sky: '#5A1E1E', ground: '#8A3B22', accent: '#FFB15C', title: 'Eldsmed', boss: { id: 'boss-vulkan', name: 'Eldfursten', goal: 'En drop där minst 80 % av plaggen köptes under maxpriset' }, blurb: 'Hett och farligt. Köp under maxpris.' },
  { id: 'moln', name: 'Molnöarna', unlockLevel: 15, sky: '#8FB3D9', ground: '#F4F1E6', accent: '#FFFFFF', title: 'Stormseglare', boss: { id: 'boss-moln', name: 'Stormfågeln', goal: 'Inga osålda plagg äldre än 90 dagar' }, blurb: 'Lätt och luftigt. Inget bundet kapital.' },
  { id: 'slott', name: 'Stjärnslottet', unlockLevel: 17, sky: '#1A1838', ground: '#3B3670', accent: '#E9B44C', title: 'Stjärnregent', boss: { id: 'boss-slott', name: 'Skuggkungen', goal: 'Månadens resultat i bokföringen på minst 10 000 kr' }, blurb: 'Toppen. Ett företag som går runt av sig självt.' },
];

export function worldFor(level: number): World {
  return [...WORLDS].reverse().find((w) => level >= w.unlockLevel) ?? WORLDS[0];
}

export function nextWorld(level: number): World | null {
  return WORLDS.find((w) => w.unlockLevel > level) ?? null;
}

// ---------- Badges (kosmetiska, samma mätvärden som v14) ----------

export const TIER_NAMES = ['Brons', 'Silver', 'Guld', 'Platina', 'Diamant'];
export const TIER_XP = [20, 40, 80, 160, 320];

export interface Badge {
  id: string;
  name: string;
  desc: string;
  value: number;
  tiers: number[];
  fmt: (n: number) => string;
}

export function badges(ds: Dataset): Badge[] {
  const L = allLanded(ds);
  const sold = L.filter((l) => isSold(l.item));
  const perMonth: Record<string, number> = {};
  let revenue = 0,
    profit = 0,
    best = 0;
  for (const l of sold) {
    const m = (l.item.saleDate ?? '').slice(0, 7);
    perMonth[m] = (perMonth[m] ?? 0) + 1;
    revenue += l.item.salePrice;
    profit += l.profit ?? 0;
    best = Math.max(best, l.profit ?? 0);
  }
  const months = new Set(live(ds.vouchers).map((v) => v.date.slice(0, 7)));
  let bestMonth = 0;
  for (const m of months) bestMonth = Math.max(bestMonth, periodPL(ds.vouchers, m).revenue);
  const kr = (n: number) => `${Math.round(n / 100).toLocaleString('sv-SE')} kr`;
  const st = (n: number) => `${n} st`;
  return [
    { id: 'sold', name: 'Säljaren', desc: 'Sålda plagg', value: sold.length, tiers: [10, 50, 100, 250, 500], fmt: st },
    { id: 'revenue', name: 'Omsättning', desc: 'Total försäljning', value: revenue, tiers: [500000, 2500000, 5000000, 10000000, 25000000], fmt: kr },
    { id: 'profit', name: 'Vinstjakt', desc: 'Total vinst på sålda plagg', value: profit, tiers: [200000, 1000000, 2500000, 5000000, 10000000], fmt: kr },
    { id: 'drops', name: 'Dropkung', desc: 'Genomförda drops', value: live(ds.drops).length, tiers: [1, 3, 5, 10, 20], fmt: st },
    { id: 'gem', name: 'Pärlfynd', desc: 'Högsta vinst på ett plagg', value: best, tiers: [30000, 60000, 100000, 150000, 250000], fmt: kr },
    { id: 'month', name: 'Rekordmånad', desc: 'Högsta månadsintäkt', value: bestMonth, tiers: [500000, 1000000, 2000000, 3000000, 5000000], fmt: kr },
    { id: 'monthsold', name: 'Månadsmaskin', desc: 'Flest sålda på en månad', value: Math.max(0, ...Object.values(perMonth)), tiers: [5, 10, 20, 30, 50], fmt: st },
    { id: 'videos', name: 'Innehållsskapare', desc: 'Loggade klipp', value: live(ds.videos).length, tiers: [1, 5, 15, 40, 100], fmt: st },
    { id: 'books', name: 'Bokförare', desc: 'Verifikat', value: live(ds.vouchers).length, tiers: [10, 25, 50, 100, 200], fmt: st },
  ];
}

export const tierOf = (b: Badge) => b.tiers.filter((t) => b.value >= t).length;

// ---------- Uppdrag ----------

export type QuestScope = 'dag' | 'vecka' | 'månad';
export type QuestCategory = 'Bokföring' | 'Marknadsföring' | 'Inköp' | 'Lager';

export interface Quest {
  id: string;
  scope: QuestScope;
  category: QuestCategory;
  title: string;
  detail: string;
  benefit: string;
  priority: 1 | 2 | 3; // 3 = viktigast
  minutes: number;
  xp: number;
  progress: { cur: number; target: number };
  done: boolean;
  route: string;
}

const xpFor = (scope: QuestScope, minutes: number) => (scope === 'dag' ? Math.min(40, 10 + Math.round(minutes / 2)) : scope === 'vecka' ? 80 : 180);

/**
 * Bygger uppdrag från verklig data. Ett uppdrag visas när det finns något att göra.
 * Klara uppdrag tas med bara om de redan var aktiva (då ska de belönas).
 */
export function generateQuests(ds: Dataset, today: ISODate, activeIds: Set<string> = new Set()): Quest[] {
  const out: Quest[] = [];
  const week = isoWeek(today);
  const month = monthOf(today);
  const w0 = weekStart(today);
  const add = (q: Omit<Quest, 'xp' | 'done'> & { xp?: number }) => {
    const done = q.progress.cur >= q.progress.target;
    if (done && !activeIds.has(q.id)) return;
    if (ds.game.completed[q.id]) return;
    out.push({ ...q, xp: q.xp ?? xpFor(q.scope, q.minutes), done });
  };
  const L = allLanded(ds);
  const drops = live(ds.drops);

  // --- Bokföring i fas ---
  for (const d of drops) {
    const hasItems = L.some((l) => l.drop.id === d.id);
    if (!hasItems || d.status === 'beställd' || !isRecentDrop(ds, d, today)) continue;
    {
      add({
        id: `customs:${d.id}`,
        scope: 'dag',
        category: 'Bokföring',
        title: `Lägg in tullkostnad för ${d.name}`,
        detail: 'Tull och importmoms från Doorzo eller tullfakturan.',
        benefit: 'Rätt hemkostnad och vinst per plagg',
        priority: 3,
        minutes: 3,
        progress: { cur: d.customs > 0 ? 1 : 0, target: 1 },
        route: `#/lager/drop/${d.id}`,
      });
    }
    {
      add({
        id: `shipping:${d.id}`,
        scope: 'dag',
        category: 'Bokföring',
        title: `Lägg in fraktkostnad för ${d.name}`,
        detail: 'Frakten fördelas på plaggen efter vikt.',
        benefit: 'Rätt hemkostnad och vinst per plagg',
        priority: 3,
        minutes: 3,
        progress: { cur: d.shipping > 0 ? 1 : 0, target: 1 },
        route: `#/lager/drop/${d.id}`,
      });
    }
  }
  const noCost = L.filter((l) => !(l.item.cost > 0)).length;
  if (noCost || activeIds.has(`nocost:${week}`))
    add({ id: `nocost:${week}`, scope: 'dag', category: 'Bokföring', title: `Sätt inköpspris på ${noCost || 'alla'} plagg som saknar det`, detail: 'Utan inköpspris blir ROI och vinst fel.', benefit: 'Korrekta siffror', priority: 2, minutes: 2 + noCost, progress: { cur: noCost ? 0 : 1, target: 1 }, route: '#/ekonomi/kontroll' });
  const noDate = L.filter((l) => isSold(l.item) && !l.item.saleDate).length;
  if (noDate || activeIds.has(`nodate:${week}`))
    add({ id: `nodate:${week}`, scope: 'dag', category: 'Bokföring', title: `Fyll i säljdatum på ${noDate || 'alla'} sålda plagg`, detail: 'Annars hamnar försäljningen i fel månad.', benefit: 'Rätt månadsresultat', priority: 2, minutes: 2, progress: { cur: noDate ? 0 : 1, target: 1 }, route: '#/ekonomi/kontroll' });
  const dups = findDuplicateSales(ds).length;
  if (dups || activeIds.has(`dups:${week}`))
    add({ id: `dups:${week}`, scope: 'dag', category: 'Bokföring', title: `Rensa ${dups || 'alla'} möjliga dubbletter i bokföringen`, detail: 'Samma försäljning bokförd två gånger gör intäkten för hög.', benefit: 'Rätt intäkt', priority: 3, minutes: 5, progress: { cur: dups ? 0 : 1, target: 1 }, route: '#/ekonomi/kontroll' });
  const unl = unlinkedSales(ds).length;
  if (unl || activeIds.has(`unlinked:${week}`))
    add({ id: `unlinked:${week}`, scope: 'dag', category: 'Bokföring', title: `Koppla ${unl || 'alla'} bokförda försäljningar till plagg`, detail: 'Då stämmer lager, analys och bokföring med varandra.', benefit: 'En sanning överallt', priority: 2, minutes: 5, progress: { cur: unl ? 0 : 1, target: 1 }, route: '#/ekonomi/kontroll' });
  const pending = live(ds.inbox).filter((d) => d.status === 'väntar').length;
  if (pending || activeIds.has(`inbox:${today}`))
    add({ id: `inbox:${today}`, scope: 'dag', category: 'Bokföring', title: `Gå igenom ${pending || 'alla'} utkast i godkännandekön`, detail: 'Godkänn eller avvisa med ett tryck.', benefit: 'Bokföringen i fas', priority: 2, minutes: 2, progress: { cur: pending ? 0 : 1, target: 1 }, route: '#/ekonomi/ko' });
  // Månadsavstämning av förra månaden, första veckan i månaden
  if (+today.slice(8, 10) <= 10) {
    const pm = prevMonth(month);
    const withAtt = new Set(live(ds.attachments).map((a) => a.voucherId));
    const missing = live(ds.vouchers).filter((v) => v.date.startsWith(pm) && v.source !== 'v14' && v.updatedBy !== 'import' && !(v.key?.includes(':sales:')) && !withAtt.has(v.id)).length;
    const serious = runChecks(ds, today).filter((g) => g.severity >= 2).reduce((s, g) => s + g.refs.length, 0);
    add({ id: `close:${pm}`, scope: 'månad', category: 'Bokföring', title: `Stäm av ${monthLabel(pm)}`, detail: `${missing} verifikat saknar underlag och ${serious} saker i Kontroll behöver åtgärdas.`, benefit: 'En månad du kan lita på', priority: 2, minutes: 20, progress: { cur: missing + serious === 0 ? 1 : 0, target: 1 }, route: '#/ekonomi/kontroll' });
  }

  // --- Marknadsföring ---
  const vids = live(ds.videos);
  const thisWeek = vids.filter((v) => v.postedAt.slice(0, 10) >= w0 && v.postedAt.slice(0, 10) <= addDays(w0, 6)).length;
  add({ id: `post2:${week}`, scope: 'vecka', category: 'Marknadsföring', title: 'Filma och posta 2 klipp den här veckan', detail: `${thisWeek} av 2 loggade.`, benefit: 'Fler som ser dina plagg', priority: 2, minutes: 60, progress: { cur: Math.min(2, thisWeek), target: 2 }, route: '#/planering/marknad' });
  const noStats = vids.filter((v) => v.views === 0 && daysBetween(v.postedAt.slice(0, 10), today) >= 2);
  if (noStats.length || activeIds.has(`stats:${week}`))
    add({ id: `stats:${week}`, scope: 'dag', category: 'Marknadsföring', title: `Lägg in statistik för ${noStats.length || 'alla'} klipp`, detail: 'Visningar, likes, kommentarer, delningar och sparade.', benefit: 'Bättre idéer utifrån vad som funkar', priority: 1, minutes: 3, progress: { cur: noStats.length ? 0 : 1, target: 1 }, route: '#/planering/marknad' });
  for (const d of drops.filter((d) => d.status === 'hemma' && daysBetween(d.date, today) <= 21 && daysBetween(d.date, today) >= 0)) {
    const has = vids.some((v) => v.dropIds.includes(d.id) || (v.type === 'Unboxing' && v.postedAt.slice(0, 10) >= d.date));
    add({ id: `unbox:${d.id}`, scope: 'vecka', category: 'Marknadsföring', title: `Gör ett unboxing-klipp av ${d.name}`, detail: 'Nya plagg är det bästa innehållet du har.', benefit: 'Snabbare försäljning av nya dropen', priority: 2, minutes: 30, progress: { cur: has ? 1 : 0, target: 1 }, route: '#/planering/video' });
  }
  const monthVids = vids.filter((v) => v.postedAt.startsWith(month)).length;
  add({ id: `post8:${month}`, scope: 'månad', category: 'Marknadsföring', title: 'Logga 8 klipp den här månaden', detail: `${monthVids} av 8.`, benefit: 'Jämn synlighet', priority: 1, minutes: 240, progress: { cur: Math.min(8, monthVids), target: 8 }, route: '#/planering/marknad' });

  // --- Smartare inköp ---
  const plan = orderPlan(ds, today);
  const soon = plan.orderBy === 'nu' || (typeof plan.orderBy === 'string' && daysBetween(today, plan.orderBy) <= 14);
  const candWeek = live(ds.candidates).filter((c) => c.createdAt.slice(0, 10) >= w0).length;
  if (soon && plan.salesPerWeek > 0)
    add({ id: `calc:${week}`, scope: 'vecka', category: 'Inköp', title: 'Gör kalkyl på 3 Doorzo-plagg inför nästa order', detail: `Lagret räcker ungefär ${plan.weeksOfStock.toFixed(1)} veckor.`, benefit: 'Köp bara det som klarar dina krav', priority: 2, minutes: 15, progress: { cur: Math.min(3, candWeek), target: 3 }, route: '#/planering/kalkyl' });
  if (ds.settings.budget === 0 && soon)
    add({ id: `budget:${month}`, scope: 'vecka', category: 'Inköp', title: 'Sätt en budget för nästa drop', detail: 'Då får du antal och maxpris per kategori.', benefit: 'Ingen överraskning när fakturan kommer', priority: 1, minutes: 5, progress: { cur: ds.settings.budget > 0 ? 1 : 0, target: 1 }, route: '#/planering/framtid' });
  const noWeight = L.filter((l) => l.drop.shipping > 0 && !(l.item.weightKg > 0)).length;
  if (noWeight || activeIds.has(`weight:${week}`))
    add({ id: `weight:${week}`, scope: 'dag', category: 'Inköp', title: `Lägg in vikt på ${noWeight || 'alla'} plagg`, detail: 'Vikten styr frakten per plagg och kalkylen för nästa order.', benefit: 'Säkrare kalkyler', priority: 1, minutes: 5, progress: { cur: noWeight ? 0 : 1, target: 1 }, route: '#/ekonomi/kontroll' });

  // --- Lager ---
  const old = L.filter((l) => !isSold(l.item) && daysBetween(l.drop.date, today) > 60);
  if (old.length) {
    const target = Math.min(3, old.length);
    const relisted = old.filter((l) => l.item.listedAt && l.item.listedAt >= w0).length;
    add({ id: `relist:${week}`, scope: 'vecka', category: 'Lager', title: `Du har ${old.length} plagg osålda över 60 dagar: publicera om minst ${target}`, detail: 'Du väljer själv vilka och om priset ska ändras.', benefit: `Frigör upp till ${Math.round(old.reduce((s, l) => s + l.landed, 0) / 100).toLocaleString('sv-SE')} kr`, priority: 2, minutes: 15, progress: { cur: Math.min(target, relisted), target }, route: '#/lager?f=old' });
  }
  return out.sort((a, b) => b.priority - a.priority || a.minutes - b.minutes);
}

/** Nya drops: skapade i Jarvis 2.0 eller daterade de senaste 45 dagarna. Gamla v14-drops bokförde frakt och tull i inköpet. */
export function isRecentDrop(ds: Dataset, d: { createdAt: string; date: string }, today: ISODate): boolean {
  const migrated = ds.settings.migratedAt ?? '';
  return (!!migrated && d.createdAt > migrated) || daysBetween(d.date, today) <= 45;
}

function monthLabel(m: string) {
  const names = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
  return names[+m.slice(5, 7) - 1];
}

/** Dagens tre viktigaste, plus veckans och månadens. */
export function questBoard(qs: Quest[]) {
  return {
    today: qs.filter((q) => q.scope === 'dag').slice(0, 3),
    week: qs.filter((q) => q.scope === 'vecka'),
    month: qs.filter((q) => q.scope === 'månad'),
  };
}

// ---------- Bossar ----------

export interface BossStatus {
  world: World;
  progress: number; // 0..1
  label: string;
  beaten: boolean;
  unlocked: boolean;
}

export function bossStatus(ds: Dataset, w: World, level: number, today: ISODate): BossStatus {
  const month = monthOf(today);
  const beaten = !!ds.game.bossesBeaten[w.boss.id];
  const unlocked = level >= w.unlockLevel;
  let progress = 0;
  let label = '';
  const L = allLanded(ds);
  switch (w.id) {
    case 'skog': {
      const g = runChecks(ds, today);
      const sc = healthScore(g);
      const sev3 = g.filter((x) => x.severity === 3).reduce((s, x) => s + x.refs.length, 0);
      progress = sev3 ? Math.min(0.9, sc / 100) : Math.min(1, sc / 90);
      label = `Hälsopoäng ${sc} · ${sev3} allvarliga fel`;
      break;
    }
    case 'oken': {
      const n = live(ds.videos).filter((v) => v.postedAt.startsWith(month) && v.views > 0).length;
      progress = Math.min(1, n / 6);
      label = `${n} av 6 klipp med statistik i ${monthLabel(month)}`;
      break;
    }
    case 'frost': {
      const s = L.filter((l) => isSold(l.item) && (l.item.saleDate ?? '').startsWith(month));
      const rev = s.reduce((a, l) => a + l.item.salePrice, 0);
      const pr = s.reduce((a, l) => a + (l.profit ?? 0), 0);
      const margin = rev ? pr / rev : 0;
      progress = Math.min(1, s.length / 20) * (margin >= 0.3 ? 1 : 0.9);
      label = `${s.length} av 20 sålda · marginal ${Math.round(margin * 100)} %`;
      break;
    }
    case 'vulkan': {
      const H = history(ds, today);
      let best = 0;
      for (const d of live(ds.drops)) {
        const items = L.filter((l) => l.drop.id === d.id);
        if (items.length < 5) continue;
        const under = items.filter((l) => {
          const m = maxPriceFor(l.item.category, H, ds.settings)?.maxPrice;
          return m != null && l.item.cost <= m;
        }).length;
        best = Math.max(best, under / items.length);
      }
      progress = Math.min(1, best / 0.8);
      label = `Bästa drop: ${Math.round(best * 100)} % under maxpris`;
      break;
    }
    case 'moln': {
      const old = L.filter((l) => !isSold(l.item) && daysBetween(l.drop.date, today) > 90).length;
      progress = old === 0 ? 1 : Math.max(0, 1 - old / 10);
      label = `${old} plagg äldre än 90 dagar`;
      break;
    }
    case 'slott': {
      const r = periodPL(ds.vouchers, month).result;
      progress = Math.max(0, Math.min(1, r / 1000000));
      label = `Resultat ${Math.round(r / 100).toLocaleString('sv-SE')} av 10 000 kr`;
      break;
    }
  }
  return { world: w, progress, label, beaten, unlocked };
}

// ---------- XP ----------

export interface XpBreakdown {
  xp: number;
  level: number;
  levelFloor: number;
  levelCeil: number;
  fromSales: number;
  fromQuests: number;
  fromBadges: number;
  fromBosses: number;
  world: World;
  next: World | null;
  streak: number;
}

export const BOSS_XP = 300;
export const BOSS_HP = 3;

export function xpInfo(ds: Dataset, today: ISODate = todayISO()): XpBreakdown {
  const start = ds.settings.gameStartedAt?.slice(0, 10) ?? today;
  const fromSales = live(ds.items).filter((i) => isSold(i) && (i.saleDate ?? '') >= start).length * 5;
  const fromQuests = Object.values(ds.game.completed).reduce((s, c) => s + c.xp, 0);
  let fromBadges = 0;
  for (const b of badges(ds)) {
    const t = tierOf(b);
    const base = ds.game.badgeBaseline[b.id] ?? t;
    for (let i = base; i < t; i++) fromBadges += TIER_XP[i];
  }
  const fromBosses = Object.keys(ds.game.bossesBeaten).length * BOSS_XP;
  const xp = fromSales + fromQuests + fromBadges + fromBosses;
  const level = levelOf(xp);
  // Streak: dagar i rad (till och med idag eller igår) med minst ett klart uppdrag
  const days = new Set(Object.values(ds.game.completed).map((c) => c.at.slice(0, 10)));
  let streak = 0;
  let d = days.has(today) ? today : addDays(today, -1);
  while (days.has(d)) {
    streak++;
    d = addDays(d, -1);
  }
  return { xp, level, levelFloor: xpForLevel(level), levelCeil: xpForLevel(level + 1), fromSales, fromQuests, fromBadges, fromBosses, world: worldFor(level), next: nextWorld(level), streak };
}

/**
 * Jämför uppdrag före och efter en ändring och returnerar ett nytt spelläge där
 * uppdrag som blivit klara är belönade. Returnerar null om inget ändrats.
 */
export function settleGame(ds: Dataset, before: Quest[], today: ISODate = todayISO()): GameState | null {
  if (!ds.settings.gameEnabled || !ds.settings.gameStartedAt) return null;
  const activeIds = new Set(before.filter((q) => !q.done).map((q) => q.id));
  const after = generateQuests(ds, today, activeIds);
  const now = new Date().toISOString();
  const completed = { ...ds.game.completed };
  let changed = false;
  for (const q of after) {
    if (q.done && activeIds.has(q.id) && !completed[q.id]) {
      completed[q.id] = { at: now, xp: q.xp, title: q.title };
      changed = true;
    }
  }
  const level = levelOf(xpInfo({ ...ds, game: { ...ds.game, completed } }, today).xp);
  const bossesBeaten = { ...ds.game.bossesBeaten };
  const bossHits = { ...(ds.game.bossHits ?? {}) };
  for (const w of WORLDS) {
    if (bossesBeaten[w.boss.id]) continue;
    const b = bossStatus(ds, w, level, today);
    const hits = bossHits[w.boss.id] ?? [];
    // Ett slag per dag när målet är uppfyllt. Tre slag (tre olika dagar) besegrar bossen.
    if (b.unlocked && b.progress >= 1 && !hits.includes(today)) {
      bossHits[w.boss.id] = [...hits, today];
      if (bossHits[w.boss.id].length >= BOSS_HP) bossesBeaten[w.boss.id] = now;
      changed = true;
    }
  }
  return changed ? { ...ds.game, completed, bossesBeaten, bossHits } : null;
}

/** Startläge när spelet slås på: historiska badges ger ingen XP, bara det du gör från och med nu. */
export function startGame(ds: Dataset): { baseline: Record<string, number> } {
  const baseline: Record<string, number> = {};
  for (const b of badges(ds)) baseline[b.id] = tierOf(b);
  return { baseline };
}
