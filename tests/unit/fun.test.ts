import { describe, expect, it } from 'vitest';
import { bestStreak, chestReward, chestsXp, gameSeason, openChest, sideQuestsFor, streakOf, streakXp, tasksXp, withVisit } from '../../src/game/fun';
import { xpInfo } from '../../src/game/engine';
import { baseRecord, defaultGame } from '../../src/domain/defaults';
import type { Task } from '../../src/domain/types';
import { ds } from './helpers';

describe('day streak', () => {
  it('räknar dagar i rad till idag, eller till igår om man inte varit inne idag', () => {
    expect(streakOf(['2026-11-24', '2026-11-25', '2026-11-26'], '2026-11-26')).toBe(3);
    expect(streakOf(['2026-11-24', '2026-11-25'], '2026-11-26')).toBe(2);
    expect(streakOf(['2026-11-22', '2026-11-25'], '2026-11-26')).toBe(1);
    expect(streakOf(['2026-11-20'], '2026-11-26')).toBe(0);
    expect(bestStreak(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-10'])).toBe(3);
  });
  it('besök sparas per person, en gång per dag, och kan fyllas på med tidigare dagar', () => {
    const g = defaultGame();
    const a = withVisit(g, 'William@x.se', '2026-11-26', ['2026-11-24', '2026-11-25'])!;
    expect(a.visits!['william@x.se']).toEqual(['2026-11-24', '2026-11-25', '2026-11-26']);
    expect(withVisit(a, 'william@x.se', '2026-11-26')).toBeNull();
    const b = withVisit(a, 'axel@x.se', '2026-11-26')!;
    expect(Object.keys(b.visits!)).toEqual(['william@x.se', 'axel@x.se']);
  });
  it('spelets streak är din egen, och milstolpar ger XP en gång', () => {
    const d = ds([], []);
    d.settings.gameStartedAt = '2026-11-01T10:00:00Z';
    d.game = { ...d.game, visits: { 'william@x.se': ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26'], 'axel@x.se': ['2026-11-26'] } };
    expect(xpInfo(d, '2026-11-26', 'William@x.se').streak).toBe(7);
    expect(xpInfo(d, '2026-11-26', 'axel@x.se').streak).toBe(1);
    expect(streakXp(d.game, '2026-11-01')).toBe(30 + 80);
    expect(xpInfo(d, '2026-11-26', 'axel@x.se').fromStreak).toBe(110);
    // Före spelstart räknas inte
    expect(streakXp(d.game, '2026-11-25')).toBe(0);
  });
});

describe('dagens kista', () => {
  it('ger 10–30 XP plus streakbonus, dubbelt i en guldkista, och kan bara öppnas en gång per dag', () => {
    const r = chestReward('2026-11-26', 0);
    expect(r.xp).toBeGreaterThanOrEqual(10);
    expect(r.xp).toBeLessThanOrEqual(60);
    expect(chestReward('2026-11-26', 5).xp - r.xp).toBe(10 * (r.gold ? 2 : 1));
    expect(chestReward('2026-11-26', 0)).toEqual(r);
    const g = openChest(defaultGame(), '2026-11-26', 'william', 0)!;
    expect(g.chests!['2026-11-26'].xp).toBe(r.xp);
    expect(openChest(g, '2026-11-26', 'axel', 0)).toBeNull();
    expect(chestsXp(g, '2026-11-01')).toBe(r.xp);
  });
});

describe('uppgifter i Att göra ger XP', () => {
  const t = (p: Partial<Task>): Task => ({ ...baseRecord(), title: 'x', date: '2026-11-26', done: true, doneAt: '2026-11-26', minutes: null, priority: 'medel', ...p });
  it('10 XP per uppgift, högst 6 om dagen, spontana uppdrag ger sin egen XP (högst 3 om dagen)', () => {
    const d = ds([], []);
    d.tasks = [
      ...Array.from({ length: 8 }, () => t({})),
      t({ questKey: 'doorzo', xp: 25 }),
      t({ questKey: 'foto', xp: 25 }),
      t({ questKey: 'klipp', xp: 35 }),
      t({ questKey: 'svara', xp: 20 }),
      t({ done: false, doneAt: null }),
      t({ doneAt: '2026-10-01' }),
    ];
    expect(tasksXp(d, '2026-11-01')).toBe(6 * 10 + 25 + 25 + 35);
  });
  it('dagens spontana uppdrag är tre olika och samma hela dagen', () => {
    const a = sideQuestsFor('2026-11-26');
    expect(a).toHaveLength(3);
    expect(new Set(a.map((q) => q.key)).size).toBe(3);
    expect(sideQuestsFor('2026-11-26')).toEqual(a);
  });
});

describe('säsong i spelet', () => {
  it('julexpeditionen till julafton, sedan vinter, vår, sommar och höst', () => {
    expect(gameSeason('2026-11-26').id).toBe('jul');
    expect(gameSeason('2026-12-24').id).toBe('jul');
    expect(gameSeason('2026-12-27').id).toBe('vinter');
    expect(gameSeason('2027-04-10').id).toBe('var');
    expect(gameSeason('2027-07-10').id).toBe('sommar');
    expect(gameSeason('2027-10-10').id).toBe('host');
  });
});

import { nextProductIds, splitProductId } from '../../src/domain/productid';
import { mkItem } from './helpers';
describe('Economizer: nästa produkt-ID', () => {
  it('delar upp ett ID', () => {
    expect(splitProductId('TS-Gar-2026-207')).toEqual({ prefix: 'TS-Gar-2026-', n: 207, width: 3 });
    expect(splitProductId('207')).toBeNull();
  });
  it('fortsätter serien efter det högsta numret', () => {
    const d = ds([], [
      mkItem({ productId: 'TS-Gar-2026-205', createdAt: '2026-11-01T10:00:00Z' }),
      mkItem({ productId: 'TS-Gar-2026-207', createdAt: '2026-11-01T10:00:00Z' }),
      mkItem({ productId: '', createdAt: '2026-11-20T10:00:00Z' }),
    ]);
    expect(nextProductIds(d, 3)).toEqual(['TS-Gar-2026-208', 'TS-Gar-2026-209', 'TS-Gar-2026-210']);
    expect(nextProductIds(ds([], []), 2)).toEqual(['', '']);
  });
});
