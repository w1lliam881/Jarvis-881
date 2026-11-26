// Economizer: nya plagg får nästa produkt-ID i din serie automatiskt (t.ex. TS-Gar-2026-207 → TS-Gar-2026-208).
import { live } from './metrics';
import type { Dataset } from './types';

/** Delar ett produkt-ID i prefix och löpnummer: "TS-Gar-2026-207" → ["TS-Gar-2026-", 207, 3]. */
export function splitProductId(id: string): { prefix: string; n: number; width: number } | null {
  const m = id.trim().match(/^(.*?)(\d+)$/);
  if (!m || !m[1]) return null;
  return { prefix: m[1], n: +m[2], width: m[2].length };
}

/**
 * Nästa n produkt-ID: samma prefix som det senast skapade plagget med produkt-ID, och nummer efter det högsta
 * med det prefixet. Finns inget produkt-ID än blir det tomt (du kan fylla i själv).
 */
export function nextProductIds(ds: Dataset, n: number): string[] {
  const withId = live(ds.items)
    .map((i) => ({ i, p: splitProductId(i.productId ?? '') }))
    .filter((x): x is { i: (typeof ds.items)[number]; p: NonNullable<ReturnType<typeof splitProductId>> } => !!x.p);
  if (!withId.length) return Array.from({ length: n }, () => '');
  // Senaste serien: det plagg som skapats sist (vid lika: högst nummer)
  const latest = withId.sort((a, b) => (a.i.createdAt === b.i.createdAt ? b.p.n - a.p.n : a.i.createdAt < b.i.createdAt ? 1 : -1))[0].p;
  const max = Math.max(...withId.filter((x) => x.p.prefix === latest.prefix).map((x) => x.p.n));
  return Array.from({ length: n }, (_, k) => `${latest.prefix}${String(max + 1 + k).padStart(latest.width, '0')}`);
}
