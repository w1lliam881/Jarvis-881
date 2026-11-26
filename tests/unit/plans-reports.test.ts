import { describe, expect, it } from 'vitest';
import { planVsActual, soldWithin, suggestPlan } from '../../src/domain/dropplan';
import { monthFigures, monthReport } from '../../src/domain/monthly';
import { clipsJustDue, clipsMissingStats } from '../../src/domain/clips';
import { baseRecord } from '../../src/domain/defaults';
import type { VideoPost } from '../../src/domain/types';
import { ds, mkDrop, mkItem } from './helpers';

// Packaging 10 kr per plagg (standard). Inga frakter, så hemkostnad = inköp + 10 kr.
const drop = mkDrop({ id: 'd1', date: '2026-10-01' });
const items = [
  mkItem({ id: 'a', cost: 20000, salePrice: 80000, saleDate: '2026-10-10' }),
  mkItem({ id: 'b', cost: 20000, salePrice: 60000, saleDate: '2026-10-25' }),
  mkItem({ id: 'c', cost: 20000, salePrice: 50000, saleDate: '2026-11-20' }),
  mkItem({ id: 'd', cost: 20000 }),
];

describe('dropmallen: plan mot utfall', () => {
  it('andel sålda inom 30 och 60 dagar', () => {
    const d = ds([drop], items);
    expect(soldWithin(d, drop, 30)).toBe(0.5); // a och b före 31/10
    expect(soldWithin(d, drop, 60)).toBe(0.75); // c 20/11 = dag 50
  });
  it('förslag bygger på historiken', () => {
    const d = ds([drop], items);
    const p = suggestPlan(d, '2026-11-26');
    expect(p.sold30).toBe(0.5);
    expect(p.sold60).toBe(0.75);
    expect(p.count).toBeGreaterThan(0);
    // snittpris sålda 633,33 kr → förväntad försäljning = antal × snittpris, avrundat till hela kronor
    expect(p.expectedRevenue).toBe(Math.round((p.count * (190000 / 3)) / 100) * 100);
  });
  it('jämför plan och utfall, med "för tidigt" när dropen är ung', () => {
    const planned = { ...drop, plan: { count: 4, budget: 84000, expectedRevenue: 260000, sold30: 0.4, sold60: 0.8, madeAt: '2026-09-20', note: '' } };
    const d = ds([planned], items);
    const young = planVsActual(d, planned, '2026-10-20')!;
    expect(young.rows.find((r) => r.label === 'Sålt efter 30 dagar')!.verdict).toBe('för tidigt');
    const r = planVsActual(d, planned, '2026-12-05')!;
    const row = (l: string) => r.rows.find((x) => x.label === l)!;
    expect(row('Antal plagg')).toMatchObject({ plan: 4, actual: 4, verdict: 'enligt plan' });
    expect(row('Kostnad hem')).toMatchObject({ plan: 84000, actual: 84000, verdict: 'enligt plan' });
    expect(row('Sålt efter 30 dagar')).toMatchObject({ plan: 40, actual: 50, verdict: 'bättre' });
    expect(row('Sålt efter 60 dagar')).toMatchObject({ plan: 80, actual: 75, verdict: 'sämre' });
    // vinst hittills: 1 900 kr sålt − 3 × 210 kr hemkostnad = 1 270 kr
    expect(row('Vinst hittills').actual).toBe(190000 - 3 * 21000);
    expect(row('Vinst hittills').verdict).toBe('för tidigt');
  });
  it('utan plan finns ingen jämförelse', () => {
    expect(planVsActual(ds([drop], items), drop, '2026-12-01')).toBeNull();
  });
});

describe('månadsrapport mot målet', () => {
  it('försäljning, kostnad och marginal per månad', () => {
    const f = monthFigures(ds([drop], items), '2026-10');
    expect(f).toMatchObject({ sold: 2, revenue: 140000, cost: 42000, profit: 98000, marginPct: 70 });
  });
  it('pågående månad räknas fram med takten och jämförs med 14 000–17 000 kr', () => {
    const r = monthReport(ds([drop], items), '2026-11', '2026-11-10');
    // 500 kr på 10 dagar → 1 500 kr på 30 dagar
    expect(r.projected).toBe(150000);
    expect(r.revenueStatus).toBe('under');
    expect(r.toMin).toBe(1400000 - 50000);
    expect(r.goal).toEqual({ min: 1400000, max: 1700000, marginPct: 37 });
    expect(r.marginStatus).toBe('nådd'); // (500 − 210) / 500 = 58 %
    expect(r.trend).toHaveLength(6);
    expect(r.lines[0]).toMatch(/1\s500 kr/);
  });
  it('avslutad månad inom målet och eget mål', () => {
    const many = Array.from({ length: 20 }, (_, i) => mkItem({ id: `x${i}`, cost: 40000, salePrice: 75000, saleDate: '2026-09-15' }));
    const d = ds([drop], many);
    const r = monthReport(d, '2026-09', '2026-11-26');
    expect(r.revenue).toBe(1500000);
    expect(r.projected).toBe(1500000);
    expect(r.revenueStatus).toBe('inom');
    expect(r.marginStatus).toBe('nådd'); // (750 − 410) / 750 = 45,3 %
    d.settings.marginGoalPct = 50;
    expect(monthReport(d, '2026-09', '2026-11-26').marginStatus).toBe('under');
  });
});

describe('påminnelse om klippens siffror efter 48 timmar', () => {
  const vid = (postedAt: string, views = 0): VideoPost => ({
    ...baseRecord(), platform: 'TikTok', title: 'k', type: 'Styling', postedAt, lengthSec: 15, song: '', views, likes: 0, comments: 0, shares: 0, saves: 0, dropIds: [], itemIds: [], ideaKey: null, note: '',
  });
  const now = new Date('2026-11-26T12:00:00Z');
  it('klipp utan siffror som är minst 48 timmar gamla', () => {
    const d = ds([], []);
    d.videos = [vid('2026-11-25T12:00:00Z'), vid('2026-11-24T11:00:00Z'), vid('2026-11-23T12:00:00Z', 500), vid('2026-10-01T12:00:00Z')];
    expect(clipsMissingStats(d, now).map((v) => v.postedAt)).toEqual(['2026-11-24T11:00:00Z']);
  });
  it('notisen skickas bara timmen då klippet passerar 48 timmar', () => {
    expect(clipsJustDue([vid('2026-11-24T11:30:00Z')], now)).toHaveLength(1);
    expect(clipsJustDue([vid('2026-11-24T10:30:00Z')], now)).toHaveLength(0);
    expect(clipsJustDue([vid('2026-11-24T12:30:00Z')], now)).toHaveLength(0);
  });
});
