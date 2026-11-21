import { describe, expect, it } from 'vitest';
import src from '../../fixtures/v14-audit.json';
import { importV14 } from '../../src/domain/import-v14';
import { WORLDS, generateQuests, levelOf, questBoard, settleGame, startGame, xpForLevel, xpInfo } from '../../src/game/engine';
import { ds as mk, mkDrop, mkItem } from './helpers';

describe('nivåer', () => {
  it('level = floor(sqrt(xp/25)) + 1', () => {
    expect(levelOf(0)).toBe(1);
    expect(levelOf(24)).toBe(1);
    expect(levelOf(25)).toBe(2);
    expect(levelOf(1225)).toBe(8);
    expect(xpForLevel(8)).toBe(1225);
  });
  it('världarna kräver ungefär lika mycket XP var (1 100–1 500), så att varje tar 3–4 veckor', () => {
    const xs = WORLDS.map((w) => xpForLevel(w.unlockLevel));
    for (let i = 1; i < xs.length; i++) {
      const gap = xs[i] - xs[i - 1];
      expect(gap).toBeGreaterThanOrEqual(1100);
      expect(gap).toBeLessThanOrEqual(1500);
    }
  });
});

describe('uppdrag från riktig data', () => {
  const { dataset } = importV14(src as any);
  const today = '2026-11-21';
  it('uppdragen bygger på datan och är konkreta', () => {
    const q = generateQuests(dataset, today);
    const ids = q.map((x) => x.id.split(':')[0]);
    expect(ids).toContain('dups'); // dubbletterna i oktober
    expect(ids).toContain('relist'); // gamla plagg
    expect(ids).toContain('post2');
    for (const x of q) {
      expect(x.title.length).toBeGreaterThan(5);
      expect(x.minutes).toBeGreaterThan(0);
      expect(x.done).toBe(false);
    }
    expect(questBoard(q).today.length).toBeLessThanOrEqual(3);
  });
  it('ett uppdrag bockas av automatiskt när datan visar att det är gjort', () => {
    const d = mkDrop({ id: 'd1', name: 'Paket 9', date: '2026-11-15' });
    let data = mk([d], [mkItem({ dropId: 'd1' })]);
    data.settings = { ...data.settings, gameStartedAt: '2026-11-20T00:00:00Z' };
    const before = generateQuests(data, today);
    expect(before.some((x) => x.id === 'customs:d1')).toBe(true);
    data = { ...data, drops: [{ ...d, customs: 50000 }] };
    const g = settleGame(data, before, today)!;
    expect(g.completed['customs:d1']).toBeTruthy();
    const xp = xpInfo({ ...data, game: g }, today);
    expect(xp.fromQuests).toBe(g.completed['customs:d1'].xp);
  });
  it('försvunna uppdrag ger ingen XP (t.ex. när dropen tas bort)', () => {
    const d = mkDrop({ id: 'd1', name: 'Paket 9', date: '2026-11-15' });
    const data = mk([d], [mkItem({ dropId: 'd1' })]);
    data.settings = { ...data.settings, gameStartedAt: '2026-11-20T00:00:00Z' };
    const before = generateQuests(data, today);
    const after = { ...data, drops: [{ ...d, deletedAt: '2026-11-21' }] };
    expect(settleGame(after, before, today)?.completed?.['customs:d1']).toBeUndefined();
  });
  it('historik ger ingen XP när spelet startas, bara det som görs efteråt', () => {
    const base = startGame(dataset).baseline;
    const data = { ...dataset, settings: { ...dataset.settings, gameStartedAt: '2026-11-21T00:00:00Z' }, game: { ...dataset.game, badgeBaseline: base } };
    expect(xpInfo(data, today).xp).toBe(0);
  });
});
