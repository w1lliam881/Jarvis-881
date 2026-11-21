import { describe, expect, it } from 'vitest';
import { desiredAll, diffLedger, eventLines, findDuplicateSales, garmentId, isBalanced, trialBalance } from '../../src/domain/ledger';
import { baseRecord } from '../../src/domain/defaults';
import type { Voucher } from '../../src/domain/types';
import { ds, mkDrop, mkItem } from './helpers';

const voucher = (p: Partial<Voucher>): Voucher => ({
  ...baseRecord(p.id), nr: 1, date: '2026-11-01', text: '', lines: [], source: 'manual', key: null, dropId: null, itemId: null, eventType: null, ok: 0, ...p,
});

describe('händelser till verifikat', () => {
  it('försäljning utan moms', () => {
    expect(eventLines('sale', 80000, { enabled: false, included: false })).toEqual([
      { account: 1930, debit: 80000, credit: 0 },
      { account: 3001, debit: 0, credit: 80000 },
    ]);
  });
  it('kostnad med 25 % moms när momsregistrerad', () => {
    const l = eventLines('material', 12500, { enabled: true, included: true });
    expect(l).toEqual([
      { account: 5460, debit: 10000, credit: 0 },
      { account: 2640, debit: 2500, credit: 0 },
      { account: 1930, debit: 0, credit: 12500 },
    ]);
    expect(isBalanced(l)).toBe(true);
  });
  it('moms ignoreras när momsregistrering är avstängd', () => {
    expect(eventLines('material', 12500, { enabled: false, included: true })).toHaveLength(2);
  });
  it('egen insättning och uttag', () => {
    expect(eventLines('deposit', 100000, { enabled: false, included: false })[1].account).toBe(2018);
    expect(eventLines('withdrawal', 100000, { enabled: false, included: false })[0].account).toBe(2013);
  });
});

describe('automatiska verifikat', () => {
  const drop = mkDrop({ id: 'd1', name: 'Paket 1', shipping: 200100, customs: 133900, date: '2026-10-01' });
  const items = [
    mkItem({ id: 'a', dropId: 'd1', cost: 15000 }),
    mkItem({ id: 'b', dropId: 'd1', cost: 20000, salePrice: 85000, saleDate: '2026-11-08' }),
  ];
  it('skapar inköp, frakt, tull och en försäljning per sålt plagg', () => {
    const d = desiredAll(ds([drop], items));
    expect(d.map((x) => x.key)).toEqual(['drop:d1:purchase', 'drop:d1:shipping', 'drop:d1:customs', 'item:b:sale']);
    for (const x of d) expect(isBalanced(x.lines)).toBe(true);
    expect(d[0].lines[0]).toEqual({ account: 4010, debit: 35000, credit: 0 });
  });
  it('exakt ett verifikat per händelse: diff skapar, uppdaterar och tar bort', () => {
    const data = ds([drop], items);
    const first = diffLedger(data);
    expect(first.create).toHaveLength(4);
    data.vouchers = first.create.map((c, i) => voucher({ id: `v${i}`, nr: i + 1, source: 'auto', key: c.key, date: c.date, text: c.text, lines: c.lines, dropId: c.dropId, itemId: c.itemId }));
    expect(diffLedger(data)).toEqual({ create: [], update: [], remove: [] });
    // Ändra priset -> verifikatet uppdateras, inget nytt skapas
    data.items = data.items.map((i) => (i.id === 'b' ? { ...i, salePrice: 90000 } : i));
    const d2 = diffLedger(data);
    expect(d2.create).toHaveLength(0);
    expect(d2.update).toHaveLength(1);
    expect(d2.update[0].desired.lines[0].debit).toBe(90000);
    // Ångra försäljningen -> verifikatet tas bort
    data.items = data.items.map((i) => (i.id === 'b' ? { ...i, salePrice: 0, saleDate: null } : i));
    expect(diffLedger(data).remove.map((v) => v.key)).toEqual(['item:b:sale']);
  });
  it('dubbla automatiska verifikat med samma nyckel tas bort', () => {
    const data = ds([drop], items);
    const c = desiredAll(data);
    data.vouchers = [...c, c[3]].map((x, i) => voucher({ id: `v${i}`, nr: i + 1, source: 'auto', key: x.key, date: x.date, text: x.text, lines: x.lines, dropId: x.dropId, itemId: x.itemId }));
    expect(diffLedger(data).remove).toHaveLength(1);
  });
  it('manuellt kopplade kostnader ger bara en justering (v14-logik)', () => {
    const data = ds([drop], items);
    data.vouchers = [voucher({ id: 'm1', dropId: 'd1', lines: [{ account: 4010, debit: 30000, credit: 0 }, { account: 1930, debit: 0, credit: 30000 }] })];
    const d = desiredAll(data);
    const adj = d.find((x) => x.key === 'drop:d1:purchase')!;
    expect(adj.text).toMatch(/justering/);
    expect(adj.lines[0].debit).toBe(35000 + 200100 + 133900 - 30000);
    expect(d.find((x) => x.key === 'drop:d1:shipping')).toBeUndefined();
  });
  it('äldre plagg bokförs samlat per drop och månad', () => {
    const its = [
      mkItem({ id: 'x', dropId: 'd1', saleBooking: 'aggregate', salePrice: 50000, saleDate: '2026-09-10' }),
      mkItem({ id: 'y', dropId: 'd1', saleBooking: 'aggregate', salePrice: 40000, saleDate: '2026-09-20' }),
      mkItem({ id: 'z', dropId: 'd1', saleBooking: 'aggregate', salePrice: 40000, saleDate: '2026-11-19' }),
    ];
    const d = desiredAll(ds([mkDrop({ id: 'd1' })], its)).filter((x) => x.key.includes(':sales:'));
    expect(d.map((x) => [x.key, x.date, x.lines[0].debit])).toEqual([
      ['drop:d1:sales:2026-09', '2026-09-20', 90000],
      ['drop:d1:sales:2026-11', '2026-11-19', 40000],
    ]);
  });
});

describe('huvudbok och dubbletter', () => {
  it('huvudboken balanserar', () => {
    const data = ds([mkDrop({ id: 'd1', shipping: 1000 })], [mkItem({ dropId: 'd1', salePrice: 5000, saleDate: '2026-11-01' })]);
    const vs = desiredAll(data).map((x, i) => voucher({ id: `${i}`, nr: i + 1, lines: x.lines }));
    const tb = trialBalance(vs);
    expect(tb.reduce((s, b) => s + b.balance, 0)).toBe(0);
  });
  it('hittar plagg-ID i texten', () => {
    expect(garmentId('Nudie average joe – TS-Gar-2026-167')).toBe('167');
    expect(garmentId('ID TS-GAR-2026-1')).toBe('');
  });
  it('flaggar manuell försäljning som redan finns på plagget', () => {
    const data = ds([mkDrop({ id: 'd1' })], [mkItem({ id: 'i1', dropId: 'd1', name: 'average joe', salePrice: 80000, saleDate: '2026-10-24', comment: 'TS-Gar-2026-170' })]);
    data.vouchers = [
      voucher({ id: 'm', text: 'Nudie Jeans average joe TS-Gar-2026-170', date: '2026-10-24', lines: [{ account: 1930, debit: 80000, credit: 0 }, { account: 3001, debit: 0, credit: 80000 }] }),
      voucher({ id: 'n', text: 'Annan försäljning', date: '2026-10-01', lines: [{ account: 1930, debit: 12300, credit: 0 }, { account: 3001, debit: 0, credit: 12300 }] }),
    ];
    const d = findDuplicateSales(data);
    expect(d.map((x) => x.voucher.id)).toEqual(['m']);
  });
});
