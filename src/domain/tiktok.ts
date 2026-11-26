// TikTok för Marketer: enkla kryss för hur ett klipp är gjort, och analys av vad som fungerar för just ditt konto.
// Inga AI-anrop. TikTok visar inte statistik via en länk, så siffrorna fyller du i själv (Analys i TikTok-appen).
import { engagement } from './video';
import { live } from './metrics';
import type { Dataset, VideoPost } from './types';

export const FORMATS = [
  'På kropp / try-on',
  'Flatlay uppifrån',
  'Galge / klädstång',
  'Närbild på detaljer',
  'Före och efter',
  'Unboxing / paket',
  'Pratar i kameran',
  'Röst över klippet',
  'Text på skärmen',
  'Trendande ljud',
  'Visar pris',
  'Ett plagg i fokus',
  'Flera plagg',
  'Utomhus',
  'Spegel',
] as const;

export const HOOKS = ['Fråga till tittaren', 'Pris eller siffra', 'POV', 'Plagget direkt', 'Före/efter direkt', 'Något roligt', 'Ingen särskild'] as const;

export const LENGTHS: { label: string; sec: number }[] = [
  { label: 'Under 10 s', sec: 8 },
  { label: '10–20 s', sec: 15 },
  { label: '20–40 s', sec: 30 },
  { label: '40–60 s', sec: 50 },
  { label: 'Över 1 min', sec: 75 },
];

/** Minsta antal klipp med siffror innan Marketer börjar ge råd och idéer. */
export const MARKETER_MIN = 5;

/** Känner igen en TikTok-länk. Kortlänkar (vm.tiktok.com) godtas men ger inget id. */
export function parseTikTokUrl(raw: string): { url: string; user: string | null; id: string | null } | null {
  const s = raw.trim();
  const m = s.match(/^https?:\/\/(?:www\.|m\.)?tiktok\.com\/@([\w.-]+)\/(?:video|photo)\/(\d+)/i);
  if (m) return { url: `https://www.tiktok.com/@${m[1]}/video/${m[2]}`, user: m[1], id: m[2] };
  if (/^https?:\/\/(?:vm|vt)\.tiktok\.com\/\w+/i.test(s)) return { url: s, user: null, id: null };
  return null;
}

export interface MarketerState {
  ready: boolean;
  logged: number;
  withStats: number;
  need: number;
}

/** Marketer jobbar först när du loggat minst fem klipp med siffror. */
export function marketerState(ds: Dataset): MarketerState {
  const vids = live(ds.videos).filter((v) => v.platform === 'TikTok');
  const withStats = vids.filter((v) => v.views > 0).length;
  return { ready: withStats >= MARKETER_MIN, logged: vids.length, withStats, need: Math.max(0, MARKETER_MIN - withStats) };
}

export interface FormatStat {
  format: string;
  count: number;
  avgViews: number;
  avgEng: number;
  /** Hur mycket bättre (över 1) eller sämre än ditt snitt klippen med detta kryss går, i visningar. */
  vsAvg: number;
}

/** Visningar och engagemang per kryss. Bara kryss som finns på minst två klipp. */
export function formatStats(videos: VideoPost[]): FormatStat[] {
  const vs = videos.filter((v) => v.views > 0);
  if (!vs.length) return [];
  const avg = vs.reduce((s, v) => s + v.views, 0) / vs.length;
  const map = new Map<string, VideoPost[]>();
  for (const v of vs) for (const f of v.formats ?? []) map.set(f, [...(map.get(f) ?? []), v]);
  return [...map]
    .filter(([, xs]) => xs.length >= 2)
    .map(([format, xs]) => {
      const avgViews = xs.reduce((s, v) => s + v.views, 0) / xs.length;
      return { format, count: xs.length, avgViews, avgEng: xs.reduce((s, v) => s + engagement(v), 0) / xs.length, vsAvg: avg ? avgViews / avg : 1 };
    })
    .sort((a, b) => b.vsAvg - a.vsAvg);
}
