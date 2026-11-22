import { describe, expect, it } from 'vitest';
import { dropStats, history, landedForDrop, periodPL } from '../../src/domain/metrics';
import { evaluateCandidate, maxPriceFor, rates } from '../../src/domain/calc';
import { defaultSettings } from '../../src/domain/defaults';
import { ds, mkDrop, mkItem, paket } from './helpers';

describe('hemkostnad', () => {
  it('fördelar frakt på vikt och tull på inköpsvärde', () => {
    const d = mkDrop({ id: 'd1', shipping: 30000, customs: 10000 });
    const a = mkItem({ id: 'a', cost: 30000, weightKg: 2 });
    const b = mkItem({ id: 'b', cost: 10000, weightKg: 1 });
    const L = landedForDrop(d, [a, b], 1000);
    expect(L[0].shippingShare).toBe(20000);
    expect(L[1].shippingShare).toBe(10000);
    expect(L[0].customsShare).toBe(7500);
    expect(L[1].customsShare).toBe(2500);
    expect(L[0].landed).toBe(30000 + 20000 + 7500 + 1000);
  });
  it('fördelar frakten lika när vikt saknas', () => {
    const d = mkDrop({ id: 'd1', shipping: 10000 });
    const L = landedForDrop(d, [mkItem({ weightKg: 0 }), mkItem({ weightKg: 0 })], 0);
    expect(L.map((l) => l.shippingShare)).toEqual([5000, 5000]);
  });
  it('Paket 1: 3 072,61 + 2 001 + 1 339, 12,9 kg, 20 plagg', () => {
    const { drop, items } = paket('p1', 307261, 200100, 133900, 12.9, 20);
    const L = landedForDrop(drop, items, 1000);
    const total = L.reduce((s, l) => s + l.landed, 0);
    expect(total).toBe(307261 + 200100 + 133900 + 20 * 1000);
    expect(L.reduce((s, l) => s + l.shippingShare, 0)).toBe(200100);
    expect(L.reduce((s, l) => s + l.customsShare, 0)).toBe(133900);
    const st = dropStats(ds([drop], items), drop);
    expect(st.cost).toBe(661261);
    expect(st.count).toBe(20);
  });
  it('Paket 2: 4 867,38 + 2 765 + 2 072, 16,45 kg, 22 plagg', () => {
    const { drop, items } = paket('p2', 486738, 276500, 207200, 16.45, 22);
    const L = landedForDrop(drop, items, 1000);
    expect(L.reduce((s, l) => s + l.landed, 0)).toBe(486738 + 276500 + 207200 + 22 * 1000);
  });
  it('lär frakt per kg och tullsats från paketen', () => {
    const p1 = paket('p1', 307261, 200100, 133900, 12.9, 20);
    const p2 = paket('p2', 486738, 276500, 207200, 16.45, 22);
    const H = history(ds([p1.drop, p2.drop], [...p1.items, ...p2.items]), '2026-11-21');
    // (2001 + 2765) / (12,9 + 16,45) ≈ 162,39 kr/kg
    expect(H.shippingPerKg).toBeGreaterThan(16200);
    expect(H.shippingPerKg).toBeLessThan(16260);
    // (1339 + 2072) / (3072,61 + 2001 + 4867,38 + 2765) ≈ 26,8 %
    expect(H.customsRate!).toBeCloseTo(341100 / (307261 + 200100 + 486738 + 276500), 6);
    expect(H.customsRate!).toBeGreaterThan(0.25);
    expect(H.customsRate!).toBeLessThan(0.28);
  });
});

describe('ROI och break-even', () => {
  it('räknar ROI = (intäkt − kostnad) / kostnad och break-even vid snittpris', () => {
    const d = mkDrop({ id: 'd1', shipping: 0, customs: 0 });
    const items = [
      mkItem({ id: 'a', cost: 10000, salePrice: 30000, saleDate: '2026-11-01' }),
      mkItem({ id: 'b', cost: 10000, salePrice: 10000, saleDate: '2026-11-02' }),
      mkItem({ id: 'c', cost: 20000 }),
    ];
    const s = dropStats({ ...ds([d], items), settings: { ...defaultSettings(), packaging: 0 } }, d);
    expect(s.cost).toBe(40000);
    expect(s.revenue).toBe(40000);
    expect(s.roi).toBe(0);
    expect(s.avgSale).toBe(20000);
    expect(s.breakEven).toBe(2);
  });
});

describe('kalkyl', () => {
  const s = defaultSettings();
  const empty = history(ds([], []), '2026-11-21');
  it('använder standardvärden utan historik: 155 kr/kg och 25,5 %', () => {
    const r = rates(empty, s);
    expect(r.shippingPerKg).toBe(15500);
    expect(r.learned).toBe(false);
    const c = evaluateCandidate({ category: 'Jeans', price: 20000, weightKg: 0, plannedSalePrice: 80000 }, empty, s);
    expect(c.weightKg).toBe(0.8);
    expect(c.shipping).toBe(12400);
    expect(c.customs).toBe(Math.round(0.255 * (20000 + 12400)));
    expect(c.landed).toBe(20000 + 12400 + c.customs + 1000);
    expect(c.verdict).toBe('Köp');
  });
  it('säger Avstå när vinsten är för låg', () => {
    const c = evaluateCandidate({ category: 'Jeans', price: 40000, weightKg: 0.8, plannedSalePrice: 50000 }, empty, s);
    expect(c.verdict).toBe('Avstå');
    expect(c.reasons.join(' ')).toMatch(/under ditt krav/);
  });
  it('maxpris uppfyller både ROI- och vinstkrav', () => {
    const d = mkDrop({ id: 'd1', shipping: 15500, customs: 5000 });
    const items = Array.from({ length: 4 }, (_, i) => mkItem({ id: `i${i}`, cost: 15000, weightKg: 1, salePrice: 80000, saleDate: '2026-11-01' }));
    const H = history(ds([d], items), '2026-11-21');
    const m = maxPriceFor('Jeans', H, s)!;
    expect(m.avgSale).toBe(80000);
    const R = rates(H, s);
    const p = m.maxPrice!;
    const landed = p + m.shipping + Math.round(R.customsRate * (p + m.shipping)) + s.packaging;
    expect((80000 - landed) / landed).toBeGreaterThanOrEqual(0.5 - 1e-3);
    expect(80000 - landed).toBeGreaterThanOrEqual(s.minProfit);
    // ett pris 5 kr högre ska inte klara kravet
    const p2 = p + 500;
    const landed2 = p2 + m.shipping + Math.round(R.customsRate * (p2 + m.shipping)) + s.packaging;
    expect((80000 - landed2) / landed2 < 0.5 || 80000 - landed2 < s.minProfit).toBe(true);
  });
});

describe('resultat från verifikat', () => {
  it('summerar intäkter och kostnader per period', () => {
    const base = { version: 1, createdAt: '', updatedAt: '', source: 'manual' as const, key: null, dropId: null, itemId: null, eventType: null, ok: 0 as const };
    const vs = [
      { ...base, id: '1', nr: 1, date: '2026-11-02', text: 'Sålt', lines: [{ account: 1930, debit: 50000, credit: 0 }, { account: 3001, debit: 0, credit: 50000 }] },
      { ...base, id: '2', nr: 2, date: '2026-11-03', text: 'Frakt', lines: [{ account: 5710, debit: 10000, credit: 0 }, { account: 1930, debit: 0, credit: 10000 }] },
      { ...base, id: '3', nr: 3, date: '2026-10-03', text: 'Okt', lines: [{ account: 4010, debit: 9900, credit: 0 }, { account: 1930, debit: 0, credit: 9900 }] },
    ];
    const pl = periodPL(vs, '2026-11');
    expect(pl.revenue).toBe(50000);
    expect(pl.costs).toBe(10000);
    expect(pl.result).toBe(40000);
    expect(periodPL(vs, '2026').costs).toBe(19900);
  });
});

import { brandStats } from '../../src/domain/metrics';
describe('märken', () => {
  it('omsättning, vinst och marginal per märke', () => {
    const d = mkDrop({ id: 'd1' });
    const items = [
      mkItem({ dropId: 'd1', brand: "Levi's", cost: 10000, salePrice: 50000, saleDate: '2026-11-01' }),
      mkItem({ dropId: 'd1', brand: "Levi's", cost: 10000, salePrice: 30000, saleDate: '2026-11-02' }),
      mkItem({ dropId: 'd1', brand: 'Nudie Jeans', cost: 20000, salePrice: 25000, saleDate: '2026-11-03' }),
      mkItem({ dropId: 'd1', brand: '', cost: 5000 }),
    ];
    const data = { ...ds([d], items), settings: { ...defaultSettings(), packaging: 0 } };
    const b = brandStats(data, '2026-11');
    expect(b.map((x) => x.brand)).toEqual(["Levi's", 'Nudie Jeans']);
    expect(b[0]).toMatchObject({ sold: 2, revenue: 80000, profit: 60000, avgPrice: 40000 });
    expect(b[0].margin).toBe(75);
    expect(b[1].margin).toBe(20);
  });
});
