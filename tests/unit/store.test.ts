import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryBackend } from '../../src/data/memory';
import { Store, setStore } from '../../src/data/store';
import { bookEvent, createDrop, deleteDrop, saveManualVoucher, sellItem, undoSale, updateDrop, updateItem } from '../../src/data/actions';
import { parseLines } from '../../src/domain/parse';
import { isBalanced } from '../../src/domain/ledger';

let backend: MemoryBackend;
let s: Store;
beforeEach(async () => {
  backend = new MemoryBackend();
  s = new Store(backend, () => 'Testare');
  setStore(s);
  await s.init();
});
const live = <T extends { deletedAt?: string | null }>(x: T[]) => x.filter((y) => !y.deletedAt);

describe('store', () => {
  it('ny drop skapar plagg och inköpsverifikat, allt bekräftat av lagringen', async () => {
    expect(await createDrop({ name: 'Paket 3', date: '2026-11-20' }, parseLines('3x Levi\'s 501 150'))).toBe(true);
    const ds = s.ds!;
    expect(live(ds.items)).toHaveLength(3);
    const v = live(ds.vouchers);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ source: 'auto', key: `drop:${ds.drops[0].id}:purchase`, nr: 1 });
    expect(v[0].lines[0].debit).toBe(45000);
    const stored = await backend.load();
    expect(stored.vouchers).toHaveLength(1);
    expect(s.status.state).toBe('saved');
  });

  it('en prisändring uppdaterar verifikatet direkt, ingen dubblett', async () => {
    await createDrop({ name: 'P', date: '2026-11-01' }, parseLines('Jeans 100'));
    const item = s.ds!.items[0];
    await sellItem(item.id, 80000, '2026-11-10', 'Vinted');
    expect(live(s.ds!.vouchers)).toHaveLength(2);
    await updateItem(item.id, { salePrice: 90000 });
    const sales = live(s.ds!.vouchers).filter((v) => v.key?.startsWith('item:'));
    expect(sales).toHaveLength(1);
    expect(sales[0].lines[0].debit).toBe(90000);
    expect(sales[0].version).toBe(2);
    await undoSale(item.id);
    expect(live(s.ds!.vouchers).filter((v) => v.key?.startsWith('item:'))).toHaveLength(0);
  });

  it('frakt kopplad till drop bokförs som eget verifikat och fördelas på plaggen', async () => {
    await createDrop({ name: 'P', date: '2026-11-01' }, parseLines('Jeans 100\nJacka 200'));
    const d = s.ds!.drops[0];
    await bookEvent({ type: 'shipping', amount: 200100, date: '2026-11-04', dropId: d.id });
    expect(s.ds!.drops[0].shipping).toBe(200100);
    expect(live(s.ds!.vouchers).find((v) => v.key?.endsWith(':shipping'))?.date).toBe('2026-11-04');
  });

  it('ångra återställer förra läget', async () => {
    await createDrop({ name: 'P', date: '2026-11-01' }, parseLines('Jeans 100'));
    const d = s.ds!.drops[0];
    await updateDrop(d.id, { name: 'Nytt namn' });
    expect(s.ds!.drops[0].name).toBe('Nytt namn');
    await s.undo();
    expect(s.ds!.drops[0].name).toBe('P');
  });

  it('borttagen drop tar bort sina automatiska verifikat (mjuk radering)', async () => {
    await createDrop({ name: 'P', date: '2026-11-01' }, parseLines('Jeans 100'));
    await deleteDrop(s.ds!.drops[0].id);
    expect(live(s.ds!.drops)).toHaveLength(0);
    expect(live(s.ds!.vouchers)).toHaveLength(0);
    expect(s.ds!.drops).toHaveLength(1);
  });

  it('obalanserat verifikat stoppas', async () => {
    const ok = await saveManualVoucher({ text: 'Fel', lines: [{ account: 1930, debit: 100, credit: 0 }, { account: 3001, debit: 0, credit: 90 }] });
    expect(ok).toBe(false);
    expect(s.status.state).toBe('error');
    expect(s.status.message).toMatch(/balanserar inte/);
    expect(live(s.ds!.vouchers)).toHaveLength(0);
  });

  it('en gammal flik kan inte skriva över nyare data', async () => {
    await createDrop({ name: 'P', date: '2026-11-01' }, parseLines('Jeans 100'));
    const other = new Store(backend, () => 'Kompis');
    await other.init();
    const id = s.ds!.drops[0].id;
    setStore(other);
    expect(await updateDrop(id, { name: 'Kompisens namn' })).toBe(true);
    setStore(s);
    // s har gammal version i minnet
    expect(await updateDrop(id, { name: 'Mitt namn' })).toBe(false);
    expect(s.status.message).toMatch(/samtidigt/);
    // efter konflikten är datan omladdad och visar kompisens ändring
    expect(s.ds!.drops[0].name).toBe('Kompisens namn');
  });

  it('alla verifikat balanserar efter en serie ändringar', async () => {
    await createDrop({ name: 'P', date: '2026-11-01' }, parseLines('5x Jeans 100'));
    for (const [k, i] of s.ds!.items.entries()) await sellItem(i.id, 50000 + k * 1000, '2026-11-1' + k, 'Plick');
    await bookEvent({ type: 'material', amount: 7300, date: '2026-11-02', text: 'Fraktpåsar' });
    for (const v of live(s.ds!.vouchers)) expect(isBalanced(v.lines)).toBe(true);
    const nrs = live(s.ds!.vouchers).map((v) => v.nr);
    expect(new Set(nrs).size).toBe(nrs.length);
  });
});

describe('försäljning av gamla plagg', () => {
  it('ett osålt plagg från en gammal drop får eget verifikat när det säljs', async () => {
    await createDrop({ name: 'Gammal', date: '2026-01-01' }, parseLines('Jeans 100'));
    const id = s.ds!.items[0].id;
    await s.save('test', (ds) => [{ collection: 'items', record: { ...ds.items[0], saleBooking: 'aggregate' } as never }]);
    await sellItem(id, 50000, '2026-11-20', 'Vinted');
    expect(s.ds!.items[0].saleBooking).toBe('individual');
    expect(live(s.ds!.vouchers).some((v) => v.key === `item:${id}:sale`)).toBe(true);
  });
});

import { changeDetails } from '../../src/domain/changes';
describe('ändringslogg', () => {
  it('visar vad som ändrades i klartext och vem som gjorde det', async () => {
    await createDrop({ name: 'P', date: '2026-11-01' }, parseLines('Jeans 100'));
    const id = s.ds!.items[0].id;
    await sellItem(id, 80000, '2026-11-10', 'Vinted');
    const log = await backend.changelog(50);
    const e = log.find((x) => x.collection === 'items' && x.action === 'ändra')!;
    expect(e.by).toBe('Testare');
    expect(changeDetails(e)).toEqual(expect.arrayContaining(['Såld för: 0 kr → 800 kr', 'Säljdatum: tomt → 2026-11-10', 'Plattform: tomt → Vinted']));
  });
});
