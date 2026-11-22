import { kr } from './money';
import type { ChangeLogEntry, CollectionName } from './types';

const LABELS: Partial<Record<CollectionName, Record<string, string>>> = {
  items: { name: 'Namn', productId: 'Produkt-ID', comment: 'Kommentar', cost: 'Inköpspris', salePrice: 'Såld för', saleDate: 'Säljdatum', platform: 'Plattform', category: 'Kategori', brand: 'Märke', model: 'Modell', size: 'Storlek', weightKg: 'Vikt', location: 'Lagerplats', listedAt: 'Publicerad', ok: 'Kontroll' },
  drops: { name: 'Namn', date: 'Datum', shipping: 'Frakt', customs: 'Tull', status: 'Status', note: 'Anteckning', ok: 'Kontroll' },
  vouchers: { text: 'Text', date: 'Datum', lines: 'Belopp', ok: 'Kontroll' },
  tasks: { title: 'Uppgift', done: 'Klar', date: 'Dag', priority: 'Prioritet' },
  goals: { name: 'Namn', target: 'Mål', current: 'Nuläge' },
  candidates: { name: 'Namn', price: 'Pris', plannedSalePrice: 'Säljpris', weightKg: 'Vikt' },
  videos: { title: 'Titel', views: 'Visningar', likes: 'Likes', comments: 'Kommentarer', shares: 'Delningar', saves: 'Sparade' },
};
const MONEY = new Set(['cost', 'salePrice', 'shipping', 'customs', 'price', 'plannedSalePrice']);

function show(key: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return 'tomt';
  if (MONEY.has(key) && typeof v === 'number') return v ? kr(v) : '0 kr';
  if (key === 'ok') return v === 1 ? 'stämmer' : v === 2 ? 'fel' : 'ej kontrollerad';
  if (key === 'done') return v ? 'klar' : 'ej klar';
  if (key === 'lines' && Array.isArray(v)) return kr(v.reduce((s: number, l: { debit: number }) => s + (l.debit ?? 0), 0));
  if (key === 'weightKg') return `${v} kg`;
  const s = String(v);
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

/** Vilka fält som ändrades, i klartext. T.ex. ["Såld för: 0 kr → 800 kr"]. */
export function changeDetails(e: ChangeLogEntry): string[] {
  const labels = LABELS[e.collection];
  if (!labels || e.action !== 'ändra' || !e.before || !e.after) return [];
  const a = e.before as Record<string, unknown>;
  const b = e.after as Record<string, unknown>;
  const out: string[] = [];
  for (const [k, label] of Object.entries(labels)) {
    if (JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null)) out.push(`${label}: ${show(k, a[k])} → ${show(k, b[k])}`);
  }
  return out;
}

/** Är ändringen gjord automatiskt av systemet (t.ex. omräknade verifikat)? */
export function isSystemChange(e: ChangeLogEntry): boolean {
  return e.collection === 'vouchers' && !!(e.after as { source?: string } | null)?.source && (e.after as { source?: string }).source === 'auto';
}

export function initial(nameOrEmail: string): string {
  return (nameOrEmail.trim()[0] ?? '?').toUpperCase();
}
