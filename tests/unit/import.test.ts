import { describe, expect, it } from 'vitest';
import src from '../../fixtures/v14-audit.json';
import { importV14, reconcile, sourceTotals } from '../../src/domain/import-v14';
import { dropStats, isSold } from '../../src/domain/metrics';

const S = src as any;

describe('migrering från v14', () => {
  const { dataset, warnings } = importV14(S);
  it('importerar utan varningar', () => expect(warnings).toEqual([]));
  it('alla totaler stämmer mot källan', () => {
    const r = reconcile(S, dataset);
    for (const l of r.lines) expect(l, l.label).toMatchObject({ ok: true });
    for (const a of r.accounts) expect(a.ok, `konto ${a.account}`).toBe(true);
  });
  it('källans siffror', () => {
    const t = sourceTotals(S);
    expect(t).toMatchObject({ drops: 9, items: 204, sold: 188, purchase: 7682711, sales: 13574705, vouchers: 51 });
  });
  it('visar de få ändringar som omräkningen av automatiska verifikat ger', () => {
    const r = reconcile(S, dataset);
    expect(r.ledgerChanges.create + r.ledgerChanges.update + r.ledgerChanges.remove).toBeLessThanOrEqual(3);
  });
  it('Oktober Paket 1 i riktig data', () => {
    const d = dataset.drops.find((x) => x.id === 'drop-okt1')!;
    expect(d.shipping).toBe(200100);
    expect(d.customs).toBe(133900);
    const s = dropStats(dataset, d);
    expect(s.count).toBe(20);
    expect(s.purchase).toBe(307261);
    expect(s.totalWeight).toBeCloseTo(12.9, 5);
    expect(s.cost).toBe(307261 + 200100 + 133900 + 20 * 1000);
  });
  it('pengar blir heltal i ören', () => {
    for (const i of dataset.items) {
      expect(Number.isInteger(i.cost)).toBe(true);
      expect(Number.isInteger(i.salePrice)).toBe(true);
    }
    expect(dataset.items.filter(isSold)).toHaveLength(188);
  });
});
