// Det som gör spelet roligt i vardagen: day streak, dagens kista, spontana uppdrag kopplade till Att göra,
// XP för klara uppgifter och säsongens tema. Rena beräkningar, testade.
import { addDays } from '../domain/dates';
import { live } from '../domain/metrics';
import type { Dataset, GameState, ISODate } from '../domain/types';

// ---------- Day streak (dagar i rad man varit inne) ----------

/** Dagar i rad till och med idag (eller igår, om man inte varit inne än idag). */
export function streakOf(days: Iterable<string>, today: ISODate): number {
  const set = new Set(days);
  let d = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Längsta streaken någonsin. */
export function bestStreak(days: Iterable<string>): number {
  const sorted = [...new Set(days)].sort();
  let best = 0,
    cur = 0,
    prev = '';
  for (const d of sorted) {
    cur = prev && addDays(prev, 1) === d ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}

/** Nytt spelläge med dagens besök registrerat för personen, eller null om det redan finns. Sparar högst 400 dagar. */
export function withVisit(game: GameState, who: string, today: ISODate, seed: string[] = []): GameState | null {
  const key = who.toLowerCase();
  const cur = game.visits?.[key] ?? [];
  if (cur.includes(today) && !seed.some((d) => !cur.includes(d))) return null;
  const days = [...new Set([...cur, ...seed, today])].sort().slice(-400);
  return { ...game, visits: { ...(game.visits ?? {}), [key]: days } };
}

export const STREAK_MILESTONES: { days: number; xp: number; name: string }[] = [
  { days: 3, xp: 30, name: 'Tre i rad' },
  { days: 7, xp: 80, name: 'En hel vecka' },
  { days: 14, xp: 150, name: 'Två veckor' },
  { days: 30, xp: 400, name: 'En månad' },
  { days: 60, xp: 800, name: 'Järnvilja' },
];

/** XP för streakmilstolpar: varje milstolpe som någon av er nått en gång (efter att spelet startats). */
export function streakXp(game: GameState, start: ISODate): number {
  let best = 0;
  for (const days of Object.values(game.visits ?? {})) best = Math.max(best, bestStreak(days.filter((d) => d >= start)));
  return STREAK_MILESTONES.filter((m) => best >= m.days).reduce((s, m) => s + m.xp, 0);
}

// ---------- Dagens kista ----------

/** Pseudoslump från ett datum, samma för alla den dagen. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

/** Hur mycket kistan ger idag: 10–30 XP plus 2 per dag i streak (högst +20). Ibland en guldkista (dubbelt). */
export function chestReward(today: ISODate, streak: number): { xp: number; gold: boolean } {
  const r = hash(`kista-${today}`);
  const base = 10 + Math.floor(r * 21);
  const gold = hash(`guld-${today}`) > 0.85;
  const xp = (base + Math.min(20, streak * 2)) * (gold ? 2 : 1);
  return { xp, gold };
}

export function chestOpened(game: GameState, today: ISODate): boolean {
  return !!game.chests?.[today];
}

export function openChest(game: GameState, today: ISODate, who: string, streak: number): GameState | null {
  if (chestOpened(game, today)) return null;
  const { xp } = chestReward(today, streak);
  return { ...game, chests: { ...(game.chests ?? {}), [today]: { by: who, xp } } };
}

// ---------- Spontana uppdrag (läggs i Att göra) ----------

export interface SideQuest {
  key: string;
  title: string;
  hint: string;
  minutes: number;
  xp: number;
}

export const SIDE_QUESTS: SideQuest[] = [
  { key: 'doorzo', title: 'Spana på Doorzo i 10 minuter', hint: 'Kolla dina sparade sökningar och lägg kalkyl på det som ser bra ut.', minutes: 10, xp: 25 },
  { key: 'foto', title: 'Fota 3 plagg', hint: 'Bra ljus, fram och bak, närbild på detaljer.', minutes: 15, xp: 25 },
  { key: 'publicera', title: 'Publicera om ett plagg som legat länge', hint: 'Nya bilder eller ny text väcker det till liv igen.', minutes: 10, xp: 20 },
  { key: 'svara', title: 'Svara på alla köpare', hint: 'Snabba svar säljer. Töm inkorgen på Vinted och Plick.', minutes: 10, xp: 20 },
  { key: 'klipp', title: 'Filma ett TikTok-klipp', hint: 'Ett plagg, 15 sekunder. Det behöver inte vara perfekt.', minutes: 20, xp: 35 },
  { key: 'matt', title: 'Mät upp 3 plagg', hint: 'Midja, innerben, ytterben och benöppning. Gör annonsen färdig direkt.', minutes: 15, xp: 25 },
  { key: 'lager', title: 'Städa lagret i 10 minuter', hint: 'Rätt plats på varje plagg i Jarvis, så hittar du dem direkt.', minutes: 10, xp: 20 },
  { key: 'kvitto', title: 'Lägg in ett underlag', hint: 'Fota ett kvitto eller spara ett mejl till ett verifikat.', minutes: 5, xp: 15 },
  { key: 'pris', title: 'Kolla 5 liknande annonser', hint: 'Se vad andra säljer samma modell för, så vet du vad marknaden tar.', minutes: 10, xp: 20 },
  { key: 'paket', title: 'Packa och posta alla sålda', hint: 'Inget ska ligga kvar. Snabb leverans ger bra betyg.', minutes: 20, xp: 30 },
];

/** Dagens tre spontana uppdrag, olika varje dag men samma för alla den dagen. */
export function sideQuestsFor(today: ISODate): SideQuest[] {
  return [...SIDE_QUESTS].sort((a, b) => hash(`${today}-${a.key}`) - hash(`${today}-${b.key}`)).slice(0, 3);
}

/** Högst så här många uppgifter om dagen ger XP, så att det inte går att samla poäng med påhittade uppgifter. */
export const TASK_XP = 10;
export const TASK_XP_PER_DAY = 6;
export const QUEST_TASKS_PER_DAY = 3;

/** XP för klara uppgifter i Att göra (efter att spelet startats): 10 XP per uppgift, spontana uppdrag ger sin egen XP. */
export function tasksXp(ds: Dataset, start: ISODate): number {
  const byDay = new Map<string, { plain: number; quest: number[] }>();
  for (const t of live(ds.tasks)) {
    if (!t.done || !t.doneAt || t.doneAt < start) continue;
    const d = byDay.get(t.doneAt) ?? { plain: 0, quest: [] };
    if (t.questKey && t.xp) d.quest.push(t.xp);
    else d.plain++;
    byDay.set(t.doneAt, d);
  }
  let xp = 0;
  for (const d of byDay.values()) xp += Math.min(TASK_XP_PER_DAY, d.plain) * TASK_XP + d.quest.slice(0, QUEST_TASKS_PER_DAY).reduce((s, x) => s + x, 0);
  return xp;
}

/** XP från dagens kistor (efter att spelet startats). */
export function chestsXp(game: GameState, start: ISODate): number {
  return Object.entries(game.chests ?? {})
    .filter(([d]) => d >= start)
    .reduce((s, [, c]) => s + c.xp, 0);
}

// ---------- Säsong ----------

export interface GameSeason {
  id: 'jul' | 'vinter' | 'var' | 'sommar' | 'host';
  name: string;
  tagline: string;
  /** Färger för spelets himmel och accent */
  sky: string;
  accent: string;
  particle: 'snö' | 'blad' | 'blommor' | 'eldflugor';
  chestName: string;
}

/** Spelets säsong: julexpeditionen fram till julafton, sedan vinter, vår, sommar och höst. */
export function gameSeason(today: ISODate): GameSeason {
  const md = today.slice(5);
  if (md >= '11-20' && md <= '12-24')
    return { id: 'jul', name: 'Julexpeditionen', tagline: 'En lucka om dagen fram till julafton. Håll streaken vid liv.', sky: '#123B2E', accent: '#C2324A', particle: 'snö', chestName: 'Dagens lucka' };
  const m = +today.slice(5, 7);
  if (m === 12 || m <= 2) return { id: 'vinter', name: 'Midvinterjakten', tagline: 'Kallt ute, varmt i lagret. Sälj det som legat.', sky: '#1F3550', accent: '#BFE3FF', particle: 'snö', chestName: 'Iskistan' };
  if (m <= 5) return { id: 'var', name: 'Vårstädningen', tagline: 'Nytt lager, nya bilder, ny fart.', sky: '#2F5A3E', accent: '#F2B8C6', particle: 'blommor', chestName: 'Blomkistan' };
  if (m <= 8) return { id: 'sommar', name: 'Midsommarsolen', tagline: 'Ljusa kvällar, korta klipp, snabba affärer.', sky: '#2C5D8A', accent: '#E9B44C', particle: 'eldflugor', chestName: 'Solkistan' };
  return { id: 'host', name: 'Höststormen', tagline: 'Jackorna säljer igen. Fyll på lagret.', sky: '#4A2E16', accent: '#E07B39', particle: 'blad', chestName: 'Lövkistan' };
}
