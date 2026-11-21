import type { Ore } from './types';

/** Kronor (decimal) till ören, avrundat. 132,19 kr -> 13219 */
export function toOre(kr: number): Ore {
  if (!Number.isFinite(kr)) return 0;
  return Math.round(kr * 100);
}

export function toKr(ore: Ore): number {
  return ore / 100;
}

/** Tolka svensk inmatning: "1 234,50", "1234.5", "350 kr", "350:-" */
export function parseKr(input: string | number | null | undefined): number {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  if (!input) return 0;
  let s = String(input)
    .replace(/ /g, ' ')
    .replace(/kr|sek|:-/gi, '')
    .trim();
  s = s.replace(/\s/g, '');
  // "1.234,50" -> "1234,50"
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
  s = s.replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function parseOre(input: string | number | null | undefined): Ore {
  return toOre(parseKr(input));
}

const nf0 = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 1667900 -> "16 679 kr" (hela kronor) */
export function kr(ore: Ore, opts: { decimals?: boolean; unit?: boolean } = {}): string {
  const v = ore / 100;
  const s = opts.decimals ? nf2.format(v) : nf0.format(Math.round(v));
  const out = s.replace(/−/g, '−');
  return opts.unit === false ? out : `${out} kr`;
}

/** Siffra utan enhet, hela kronor */
export function num(ore: Ore): string {
  return kr(ore, { unit: false });
}

export function pct(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return '–';
  const f = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
  return `${f.format(n)} %`.replace(/−/g, '−');
}

export function signedPct(n: number): string {
  if (!Number.isFinite(n)) return '–';
  const r = Math.round(n);
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${new Intl.NumberFormat('sv-SE').format(Math.abs(r))}\u00a0%`;
}

export function sum(values: Ore[]): Ore {
  let s = 0;
  for (const v of values) s += v;
  return s;
}

/**
 * Fördela ett heltalsbelopp proportionellt mot vikter så att summan blir exakt totalen
 * (största-rest-metoden). Om alla vikter är 0 fördelas lika.
 */
export function allocate(total: Ore, weights: number[]): Ore[] {
  const n = weights.length;
  if (n === 0) return [];
  let w = weights.map((x) => (Number.isFinite(x) && x > 0 ? x : 0));
  let W = w.reduce((a, b) => a + b, 0);
  if (W === 0) {
    w = w.map(() => 1);
    W = n;
  }
  const raw = w.map((x) => (total * x) / W);
  const base = raw.map((x) => Math.floor(x));
  let rest = total - base.reduce((a, b) => a + b, 0);
  const order = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rest > 0 && k < order.length; k++, rest--) base[order[k].i] += 1;
  return base;
}
