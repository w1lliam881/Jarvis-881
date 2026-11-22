import type { ISODate } from './types';

const TZ = 'Europe/Stockholm';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Dagens datum i Stockholm som YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): ISODate {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function toDate(d: ISODate): Date {
  return new Date(`${d}T12:00:00`);
}

export function addDays(d: ISODate, n: number): ISODate {
  const x = toDate(d);
  x.setDate(x.getDate() + n);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);
}

export function monthOf(d: ISODate): string {
  return d.slice(0, 7);
}

export function prevMonth(m: string): string {
  let y = +m.slice(0, 4);
  let mo = +m.slice(5, 7) - 1;
  if (mo < 1) {
    y--;
    mo = 12;
  }
  return `${y}-${pad(mo)}`;
}

export function nextMonth(m: string): string {
  let y = +m.slice(0, 4);
  let mo = +m.slice(5, 7) + 1;
  if (mo > 12) {
    y++;
    mo = 1;
  }
  return `${y}-${pad(mo)}`;
}

export function daysInMonth(m: string): number {
  return new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();
}

export function lastDayOfMonth(m: string): ISODate {
  return `${m}-${pad(daysInMonth(m))}`;
}

/** Måndag i veckan för datumet */
export function weekStart(d: ISODate): ISODate {
  const x = toDate(d);
  return addDays(d, -((x.getDay() + 6) % 7));
}

/** ISO-veckonummer, t.ex. "2026-W47" */
export function isoWeek(d: ISODate): string {
  const x = toDate(d);
  const t = new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${pad(w)}`;
}

const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const WEEKDAYS = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];

export function monthName(m: string, withYear = true): string {
  const name = MONTHS[+m.slice(5, 7) - 1] ?? m;
  return withYear ? `${name} ${m.slice(0, 4)}` : name;
}

export function shortDate(d: ISODate): string {
  return `${+d.slice(8, 10)} ${MONTHS_SHORT[+d.slice(5, 7) - 1]}`;
}

export function longDate(d: ISODate): string {
  const x = toDate(d);
  const wd = WEEKDAYS[x.getDay()];
  return `${wd[0].toUpperCase()}${wd.slice(1)} ${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]}`;
}

export function weekdayShort(d: ISODate): string {
  return WEEKDAYS[toDate(d).getDay()].slice(0, 3);
}

export function isISODate(s: unknown): s is ISODate {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
