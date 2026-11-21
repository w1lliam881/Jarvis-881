import { describe, expect, it } from 'vitest';
import src from '../../fixtures/v14-audit.json';
import { importV14 } from '../../src/domain/import-v14';
import { healthScore, runChecks } from '../../src/domain/checks';
import { encodeCp437, sie4, toCsv, vouchersCsv } from '../../src/domain/export';
import { ds, mkDrop, mkItem } from './helpers';

describe('kontroll', () => {
  it('hittar sålda utan datum och osålda över 60 dagar', () => {
    const data = ds([mkDrop({ id: 'd1', date: '2026-08-01' })], [mkItem({ dropId: 'd1', salePrice: 10000 }), mkItem({ dropId: 'd1' })]);
    const g = runChecks(data, '2026-11-21');
    expect(g.map((x) => x.id)).toEqual(expect.arrayContaining(['sold-no-date', 'old-stock']));
    expect(healthScore(g)).toBeLessThan(100);
  });
  it('riktig data: hittar dubbletterna i oktober', () => {
    const { dataset } = importV14(src as any);
    const g = runChecks(dataset, '2026-11-21');
    const dup = g.find((x) => x.id === 'duplicates');
    expect(dup?.refs.length ?? 0).toBeGreaterThanOrEqual(1);
    const score = healthScore(g);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('export', () => {
  it('csv med BOM och citering', () => {
    expect(toCsv([['a;b', 'c']])).toBe('﻿"a;b";c');
  });
  it('SIE 4 med verifikat och balanserade transaktioner', () => {
    const { dataset } = importV14(src as any);
    const s = sie4(dataset, '2026', '2026-11-21');
    expect(s).toContain('#SIETYP 4');
    expect(s).toContain('#RAR 0 20260101 20261231');
    expect(s).toMatch(/#VER "" \d+ 2026\d{4} "/);
    // varje #VER-block balanserar
    const blocks = s.split('#VER').slice(1);
    for (const b of blocks) {
      const sum = [...b.matchAll(/#TRANS \d+ \{\} (-?\d+\.\d{2})/g)].reduce((a, m) => a + Math.round(parseFloat(m[1]) * 100), 0);
      expect(sum).toBe(0);
    }
    expect(Array.from(encodeCp437('åäö'))).toEqual([0x86, 0x84, 0x94]);
  });
  it('verifikat-csv har en rad per kontorad', () => {
    const { dataset } = importV14(src as any);
    const rows = vouchersCsv(dataset).split('\r\n');
    expect(rows.length).toBe(1 + dataset.vouchers.reduce((s, v) => s + v.lines.length, 0));
  });
});
