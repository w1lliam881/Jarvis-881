import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryBackend } from '../../src/data/memory';
import { Store, setStore } from '../../src/data/store';
import { bookEvent, createDrop, linkSaleToItem, deleteDrop, saveManualVoucher, sellItem, undoSale, updateDrop, updateItem } from '../../src/data/actions';
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

  it('en bokförd försäljning kan kopplas till ett plagg som redan är sålt utan att räknas två gånger', async () => {
    await createDrop({ name: 'P', date: '2026-10-01' }, parseLines('average joe 100'));
    const item = s.ds!.items[0];
    await sellItem(item.id, 80000, '2026-11-19', 'Vinted');
    await saveManualVoucher({ date: '2026-10-24', text: 'Nudie Jeans average joe. ID -TS-GAR-2026-170', lines: [{ account: 1930, debit: 80000, credit: 0 }, { account: 3001, debit: 0, credit: 80000 }] });
    const manual = live(s.ds!.vouchers).find((v) => v.source !== 'auto')!;
    expect(live(s.ds!.vouchers).filter((v) => v.lines.some((l) => l.account === 3001))).toHaveLength(2);
    expect(await linkSaleToItem(manual.id, item.id, 80000)).toBe(true);
    const sales = live(s.ds!.vouchers).filter((v) => v.lines.some((l) => l.account === 3001));
    expect(sales).toHaveLength(1);
    expect(sales[0].id).toBe(manual.id);
    const it2 = s.ds!.items.find((i) => i.id === item.id)!;
    expect(it2).toMatchObject({ saleDate: '2026-10-24', salePrice: 80000, productId: 'TS-GAR-2026-170' });
  });

  const income = () => live(s.ds!.vouchers).reduce((sum, v) => sum + v.lines.reduce((a, l) => (l.account === 3001 ? a + l.credit - l.debit : a), 0), 0);
  const lockThrough = (date: string) => s.save('lås', (ds) => [{ settings: { ...ds.settings, lockedThrough: date } }]);
  const manualSale = async (date: string, amount: number) => {
    await saveManualVoucher({ date, text: 'Swish försäljning', lines: [{ account: 1930, debit: amount, credit: 0 }, { account: 3001, debit: 0, credit: amount }] });
    return live(s.ds!.vouchers).filter((v) => v.source !== 'auto').at(-1)!;
  };

  it('kopplingen stoppas om plaggets eget försäljningsverifikat ligger i låst period', async () => {
    await createDrop({ name: 'P', date: '2026-09-01' }, parseLines('Jeans 100'));
    const item = s.ds!.items[0];
    await sellItem(item.id, 80000, '2026-09-10', 'Vinted');
    const manual = await manualSale('2026-11-05', 80000);
    await lockThrough('2026-09-30');
    const before = income();
    expect(await linkSaleToItem(manual.id, item.id, 80000)).toBe(false);
    expect(s.status.state).toBe('error');
    expect(s.status.message).toMatch(/låst period/);
    expect(s.status.message).toMatch(/två gånger/);
    expect(income()).toBe(before);
    expect(s.ds!.vouchers.find((v) => v.id === manual.id)!.itemId).toBeNull();
    expect(s.ds!.items.find((i) => i.id === item.id)!.saleDate).toBe('2026-09-10');
  });

  it('kopplingen stoppas om verifikatet självt ligger i låst period', async () => {
    await createDrop({ name: 'P', date: '2026-09-01' }, parseLines('Jeans 100'));
    const item = s.ds!.items[0];
    const manual = await manualSale('2026-09-15', 80000);
    await lockThrough('2026-09-30');
    expect(await linkSaleToItem(manual.id, item.id, 80000)).toBe(false);
    expect(s.status.message).toMatch(/låst period/);
    expect(s.ds!.items.find((i) => i.id === item.id)!.salePrice).toBe(0);
  });

  it('samlat bokfört plagg (bk = 1): kopplingen ger inte dubbel intäkt', async () => {
    await createDrop({ name: 'Gammal', date: '2026-08-01' }, parseLines('Jeans 100\nJacka 100'));
    const [a, b] = s.ds!.items;
    await s.save('test', (ds) => [
      { collection: 'items', record: { ...ds.items[0], saleBooking: 'aggregate', salePrice: 50000, saleDate: '2026-10-10' } as never },
      { collection: 'items', record: { ...ds.items[1], saleBooking: 'aggregate', salePrice: 30000, saleDate: '2026-10-12' } as never },
    ]);
    expect(income()).toBe(80000);
    const manual = await manualSale('2026-10-20', 50000);
    expect(income()).toBe(130000);
    expect(await linkSaleToItem(manual.id, a.id, 50000)).toBe(true);
    expect(income()).toBe(80000);
    const agg = live(s.ds!.vouchers).filter((v) => v.key?.includes(':sales:'));
    expect(agg).toHaveLength(1);
    expect(agg[0].lines.find((l) => l.account === 3001)!.credit).toBe(30000);
    expect(s.ds!.items.find((i) => i.id === b.id)!.saleBooking).toBe('aggregate');
    for (const v of live(s.ds!.vouchers)) expect(isBalanced(v.lines)).toBe(true);
  });

  it('samlat bokfört plagg (bk = 1): kopplingen stoppas om det samlade verifikatet ligger i låst period', async () => {
    await createDrop({ name: 'Gammal', date: '2026-08-01' }, parseLines('Jeans 100'));
    const a = s.ds!.items[0];
    await s.save('test', (ds) => [{ collection: 'items', record: { ...ds.items[0], saleBooking: 'aggregate', salePrice: 50000, saleDate: '2026-09-10' } as never }]);
    const manual = await manualSale('2026-11-02', 50000);
    await lockThrough('2026-09-30');
    const before = income();
    expect(await linkSaleToItem(manual.id, a.id, 50000)).toBe(false);
    expect(s.status.message).toMatch(/två gånger/);
    expect(income()).toBe(before);
    expect(s.ds!.items.find((i) => i.id === a.id)!.saleBooking).toBe('aggregate');
  });

  it('samlat bokfört plagg (bk = 1): stoppas om det samlade verifikatet skulle flyttas in i låst period', async () => {
    await createDrop({ name: 'Gammal', date: '2026-08-01' }, parseLines('Jeans 100\nJacka 100'));
    const a = s.ds!.items[0];
    await s.save('test', (ds) => [
      { collection: 'items', record: { ...ds.items[0], saleBooking: 'aggregate', salePrice: 50000, saleDate: '2026-10-20' } as never },
      { collection: 'items', record: { ...ds.items[1], saleBooking: 'aggregate', salePrice: 30000, saleDate: '2026-10-05' } as never },
    ]);
    const manual = await manualSale('2026-11-02', 50000);
    await lockThrough('2026-10-15');
    const before = income();
    expect(await linkSaleToItem(manual.id, a.id, 50000)).toBe(false);
    expect(s.status.message).toMatch(/låst period/);
    expect(income()).toBe(before);
  });
});
