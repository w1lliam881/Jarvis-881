import { describe, expect, it } from 'vitest';
import { buyingSeason, growthBudget, seasonalShares, seasonOf } from '../../src/domain/season';
import { orderPlan } from '../../src/domain/calc';
import { ds, mkDrop, mkItem } from './helpers';

describe('säsong', () => {
  it('månad till säsong', () => {
    expect(seasonOf('2026-12-01')).toBe('vinter');
    expect(seasonOf('2027-02-28')).toBe('vinter');
    expect(seasonOf('2027-03-01')).toBe('vår');
    expect(seasonOf('2027-07-10')).toBe('sommar');
    expect(seasonOf('2026-11-25')).toBe('höst');
  });
  it('inköp i slutet av november säljs på vintern', () => {
    expect(buyingSeason('2026-11-25')).toBe('vinter');
    expect(buyingSeason('2027-05-20')).toBe('sommar');
  });
  it('vintern ger mer jackor och färre t-shirts än historiken', () => {
    const s = seasonalShares({ Jeans: 1, Jackor: 1, 'T-shirts': 1 }, 'vinter');
    expect(s.Jackor! > s.Jeans!).toBe(true);
    expect(s['T-shirts']! < 1 / 3).toBe(true);
    expect((s.Jeans ?? 0) + (s.Jackor ?? 0) + (s['T-shirts'] ?? 0)).toBeCloseTo(1, 10);
  });
  it('orderplanen visar säsongen och lägger mindre på t-shirts på vintern', () => {
    const d = mkDrop({ id: 'd1', date: '2026-09-01' });
    const items = [
      ...Array.from({ length: 4 }, (_, i) => mkItem({ id: `j${i}`, category: 'Jeans', cost: 20000, salePrice: 60000, saleDate: '2026-10-01' })),
      ...Array.from({ length: 4 }, (_, i) => mkItem({ id: `t${i}`, category: 'T-shirts', cost: 20000, salePrice: 60000, saleDate: '2026-10-01' })),
    ];
    const p = orderPlan(ds([d], items), '2026-11-25');
    expect(p.season).toBe('vinter');
    const jeans = p.rows.find((r) => r.category === 'Jeans')!;
    const tees = p.rows.find((r) => r.category === 'T-shirts')!;
    expect(jeans.share).toBeGreaterThan(tees.share);
  });
});

describe('nästa drops storlek', () => {
  const drop = (id: string, date: string, n: number, sold: number, cost = 20000) => ({
    d: mkDrop({ id, date, name: id }),
    items: Array.from({ length: n }, (_, i) => mkItem({ id: `${id}-${i}`, dropId: id, cost, salePrice: i < sold ? 50000 : 0, saleDate: i < sold ? date : null })),
  });
  it('växer 15 % när senaste dropen säljer snabbt', () => {
    const a = drop('A', '2026-10-01', 10, 9);
    const g = growthBudget(ds([a.d], a.items), '2026-11-15');
    expect(g.growthPct).toBe(15);
    // 10 plagg × (200 kr + 10 kr förpackning) = 2 100 kr → 2 415 kr → avrundat 2 400 kr
    expect(g.lastCost).toBe(210000);
    expect(g.suggested).toBe(240000);
  });
  it('krymper när dropen säljer dåligt', () => {
    const a = drop('A', '2026-09-01', 10, 1);
    expect(growthBudget(ds([a.d], a.items), '2026-11-15').growthPct).toBe(-10);
  });
  it('straffar inte en ny drop som inte hunnit sälja', () => {
    const a = drop('A', '2026-11-10', 10, 2);
    expect(growthBudget(ds([a.d], a.items), '2026-11-15').growthPct).toBeGreaterThanOrEqual(10);
  });
  it('går aldrig över 80 % av budgeten', () => {
    const a = drop('A', '2026-10-01', 10, 9);
    const D = ds([a.d], a.items);
    D.settings.budget = 200000;
    const g = growthBudget(D, '2026-11-15');
    expect(g.suggested).toBeLessThanOrEqual(160000);
    expect(g.reserve).toBe(200000 - g.suggested);
  });
  it('utan drops och budget finns inget förslag', () => {
    const g = growthBudget(ds([], []), '2026-11-15');
    expect(g.suggested).toBe(0);
    expect(g.reasons.length).toBe(1);
  });
});

import { snowLevel, villageTheme } from '../../src/domain/season';

describe('jul och snö i Agentbyn', () => {
  it('från 20 november till och med julafton, sedan inte', () => {
    expect(villageTheme(new Date('2026-11-19T12:00:00Z')).xmas).toBe(false);
    expect(villageTheme(new Date('2026-11-20T12:00:00Z'))).toMatchObject({ xmas: true, snowing: true });
    expect(villageTheme(new Date('2026-12-24T20:00:00Z')).xmas).toBe(true);
    expect(villageTheme(new Date('2026-12-25T08:00:00Z'))).toEqual({ xmas: false, snowing: false, snowBase: 0 });
    expect(villageTheme(new Date('2027-06-01T12:00:00Z')).snowing).toBe(false);
  });
  it('snön lägger sig mer för varje dag och medan sidan är öppen', () => {
    const a = villageTheme(new Date('2026-11-21T09:00:00Z')).snowBase;
    const b = villageTheme(new Date('2026-12-05T09:00:00Z')).snowBase;
    const c = villageTheme(new Date('2026-12-05T20:00:00Z')).snowBase;
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    const t = villageTheme(new Date('2026-12-05T09:00:00Z'));
    expect(snowLevel(t, 60)).toBeGreaterThan(snowLevel(t, 0));
    expect(snowLevel(t, 100000)).toBeCloseTo(Math.min(1, t.snowBase + 0.3));
    expect(snowLevel({ xmas: false, snowing: false, snowBase: 0 }, 500)).toBe(0);
  });
});

import { MELODY, MELODY_BEATS } from '../../src/game/music';
describe('julmusiken', () => {
  it('refrängen går jämnt upp i takter om fyra slag', () => {
    expect(MELODY_BEATS % 4).toBe(0);
    expect(MELODY_BEATS).toBe(64);
    expect(MELODY.every(([n]) => /^[A-G]\d$/.test(n))).toBe(true);
  });
});
