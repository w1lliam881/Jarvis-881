import { describe, expect, it } from 'vitest';
import src from '../../fixtures/v14-audit.json';
import { importV14 } from '../../src/domain/import-v14';
import { prevQuarter, quarterOf, quarterRange, quarterReport } from '../../src/domain/quarter';
import { defaultSettings } from '../../src/domain/defaults';
import { ds, mkDrop, mkItem } from './helpers';

describe('kvartal', () => {
  it('datum till kvartal och intervall', () => {
    expect(quarterOf('2026-11-21')).toEqual({ year: 2026, q: 4 });
    expect(quarterRange({ year: 2026, q: 1 })).toEqual({ from: '2026-01-01', to: '2026-03-31' });
    expect(prevQuarter({ year: 2026, q: 1 })).toEqual({ year: 2025, q: 4 });
  });
  it('summerar sålda plagg, märken och inköpsprisintervall', () => {
    const d = mkDrop({ id: 'd1', date: '2026-10-01' });
    const items = [
      ...[1, 2, 3].map((n) => mkItem({ id: `l${n}`, dropId: 'd1', brand: "Levi's", cost: 15000, salePrice: 80000, saleDate: `2026-11-0${n}` })),
      mkItem({ id: 'x', dropId: 'd1', brand: 'Edwin', cost: 40000, salePrice: 45000, saleDate: '2026-11-05' }),
      mkItem({ id: 'u', dropId: 'd1', brand: 'Edwin', cost: 30000 }),
    ];
    const data = { ...ds([d], items), settings: { ...defaultSettings(), packaging: 0 } };
    const r = quarterReport(data, { year: 2026, q: 4 });
    expect(r.soldCount).toBe(4);
    expect(r.soldRevenue).toBe(285000);
    expect(r.brands[0]).toMatchObject({ key: "Levi's", sold: 3, revenue: 240000, profit: 195000 });
    expect(r.costBuckets.find((b) => b.key === '100–199 kr')?.sold).toBe(3);
    expect(r.unsoldEnd).toBe(1);
  });
  it('riktig data ger en rapport för Q4 2026', () => {
    const { dataset } = importV14(src as any);
    const r = quarterReport(dataset, { year: 2026, q: 4 });
    expect(r.soldCount).toBeGreaterThan(20);
    expect(r.brands.length).toBeGreaterThan(3);
    expect(r.notes.length).toBeGreaterThan(0);
  });
});
