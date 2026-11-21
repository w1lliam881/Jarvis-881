import { isSold, itemsOfDrop, live } from './metrics';
import type { Account, Dataset, Drop, EventType, ISODate, Item, Ore, Voucher, VoucherLine } from './types';

export const ACCOUNTS: Record<number, string> = {
  1930: 'Företagskonto',
  2010: 'Eget kapital',
  2013: 'Egna uttag',
  2018: 'Egen insättning',
  2610: 'Utgående moms',
  2640: 'Ingående moms',
  3001: 'Försäljning varor',
  4010: 'Inköp varor',
  5460: 'Förbrukningsmaterial',
  5710: 'Frakter',
  5720: 'Tull och spedition',
  5990: 'Annonsering',
  6570: 'Bankkostnader',
  6590: 'Övriga externa tjänster',
};

export function accountName(a: Account): string {
  return ACCOUNTS[a] ?? `Konto ${a}`;
}

export const EVENT_TYPES: Record<EventType, { label: string; account: Account; kind: 'income' | 'cost' | 'deposit' | 'withdrawal' }> = {
  sale: { label: 'Försäljning', account: 3001, kind: 'income' },
  purchase: { label: 'Inköp varor', account: 4010, kind: 'cost' },
  shipping: { label: 'Frakt', account: 5710, kind: 'cost' },
  customs: { label: 'Tull och importmoms', account: 5720, kind: 'cost' },
  material: { label: 'Förpackning/material', account: 5460, kind: 'cost' },
  ads: { label: 'Annonsering', account: 5990, kind: 'cost' },
  bankfee: { label: 'Bankavgift', account: 6570, kind: 'cost' },
  platformfee: { label: 'Plattformsavgift', account: 6590, kind: 'cost' },
  deposit: { label: 'Egen insättning', account: 2018, kind: 'deposit' },
  withdrawal: { label: 'Eget uttag', account: 2013, kind: 'withdrawal' },
};

/** Verifikatrader för en enkel händelse. Moms används bara om momsregistrering är påslagen. */
export function eventLines(type: EventType, amount: Ore, vat: { enabled: boolean; included: boolean; rate?: number }): VoucherLine[] {
  const t = EVENT_TYPES[type];
  const rate = vat.rate ?? 0.25;
  const useVat = vat.enabled && vat.included && (t.kind === 'income' || t.kind === 'cost');
  const net = useVat ? Math.round(amount / (1 + rate)) : amount;
  const tax = amount - net;
  switch (t.kind) {
    case 'income':
      return clean([
        { account: 1930, debit: amount, credit: 0 },
        { account: t.account, debit: 0, credit: net },
        { account: 2610, debit: 0, credit: tax },
      ]);
    case 'cost':
      return clean([
        { account: t.account, debit: net, credit: 0 },
        { account: 2640, debit: tax, credit: 0 },
        { account: 1930, debit: 0, credit: amount },
      ]);
    case 'deposit':
      return [
        { account: 1930, debit: amount, credit: 0 },
        { account: 2018, debit: 0, credit: amount },
      ];
    case 'withdrawal':
      return [
        { account: 2013, debit: amount, credit: 0 },
        { account: 1930, debit: 0, credit: amount },
      ];
  }
}

function clean(lines: VoucherLine[]): VoucherLine[] {
  return lines.filter((l) => l.debit !== 0 || l.credit !== 0);
}

export function voucherBalance(lines: VoucherLine[]): Ore {
  return lines.reduce((s, l) => s + l.debit - l.credit, 0);
}

export function isBalanced(lines: VoucherLine[]): boolean {
  return voucherBalance(lines) === 0;
}

export function voucherAmount(v: { lines: VoucherLine[] }): Ore {
  return v.lines.reduce((s, l) => s + l.debit, 0);
}

export function saleAmount(v: { lines: VoucherLine[] }): Ore {
  return v.lines.reduce((s, l) => (l.account >= 3000 && l.account < 4000 ? s + l.credit - l.debit : s), 0);
}

// ---------- Automatiska verifikat ----------

export interface DesiredVoucher {
  key: string;
  date: ISODate;
  text: string;
  lines: VoucherLine[];
  dropId: string | null;
  itemId: string | null;
}

/** Manuella/importerade verifikat som är kopplade till en drop (v14: "ad"). */
function linkedManualCosts(ds: Dataset, dropId: string): Ore {
  let s = 0;
  for (const v of ds.vouchers) {
    if (v.deletedAt || v.source === 'auto' || v.dropId !== dropId || v.itemId) continue;
    for (const l of v.lines) if (l.account === 4010 || l.account === 5710 || l.account === 5720) s += l.debit - l.credit;
  }
  return s;
}

function hasLinkedManual(ds: Dataset, dropId: string): boolean {
  return ds.vouchers.some(
    (v) => !v.deletedAt && v.source !== 'auto' && v.dropId === dropId && !v.itemId && v.lines.some((l) => [4010, 5710, 5720].includes(l.account)),
  );
}

/** Belopp under 1 kr räknas som noll vid justeringar (samma tolerans som v14). */
const near0 = (n: Ore): Ore => (Math.abs(n) < 100 ? 0 : n);

export function desiredForDrop(ds: Dataset, drop: Drop): DesiredVoucher[] {
  const items = itemsOfDrop(ds, drop.id);
  const purchase = items.reduce((s, i) => s + i.cost, 0);
  const out: DesiredVoucher[] = [];
  const vatToInput = ds.settings.vatEnabled && !ds.settings.importVatToCustoms;
  void vatToInput;

  if (hasLinkedManual(ds, drop.id)) {
    // Delar av inköpet är bokade manuellt: boka bara skillnaden som justering.
    const diff = near0(purchase + drop.shipping + drop.customs - linkedManualCosts(ds, drop.id));
    if (diff !== 0)
      out.push({
        key: `drop:${drop.id}:purchase`,
        date: drop.date,
        text: `Inköp ${drop.name} (justering)`,
        lines: diff > 0 ? [l(4010, diff, 0), l(1930, 0, diff)] : [l(4010, 0, -diff), l(1930, -diff, 0)],
        dropId: drop.id,
        itemId: null,
      });
  } else {
    if (purchase > 0)
      out.push({
        key: `drop:${drop.id}:purchase`,
        date: drop.date,
        text: `Inköp ${drop.name} (${items.length} plagg)`,
        lines: [l(4010, purchase, 0), l(1930, 0, purchase)],
        dropId: drop.id,
        itemId: null,
      });
    if (drop.shipping > 0)
      out.push({
        key: `drop:${drop.id}:shipping`,
        date: drop.shippingDate || drop.date,
        text: `Frakt ${drop.name}`,
        lines: [l(5710, drop.shipping, 0), l(1930, 0, drop.shipping)],
        dropId: drop.id,
        itemId: null,
      });
    if (drop.customs > 0)
      out.push({
        key: `drop:${drop.id}:customs`,
        date: drop.customsDate || drop.shippingDate || drop.date,
        text: `Tull och importmoms ${drop.name}`,
        lines: [l(5720, drop.customs, 0), l(1930, 0, drop.customs)],
        dropId: drop.id,
        itemId: null,
      });
  }

  // Äldre plagg som bokförs samlat: ett verifikat per drop och försäljningsmånad,
  // daterat på månadens senaste försäljningsdag.
  const byMonth = new Map<string, { sum: Ore; date: string }>();
  for (const i of items) {
    if (i.saleBooking !== 'aggregate' || !isSold(i)) continue;
    const date = i.saleDate || drop.date;
    const m = date.slice(0, 7);
    const cur = byMonth.get(m) ?? { sum: 0, date: '' };
    cur.sum += i.salePrice;
    if (date > cur.date) cur.date = date;
    byMonth.set(m, cur);
  }
  for (const [m, x] of [...byMonth].sort()) {
    if (x.sum <= 0) continue;
    out.push({
      key: `drop:${drop.id}:sales:${m}`,
      date: x.date,
      text: `Försäljning ${drop.name} (samlad, äldre plagg)`,
      lines: [l(1930, x.sum, 0), l(3001, 0, x.sum)],
      dropId: drop.id,
      itemId: null,
    });
  }
  return out;
}

export function desiredForItem(ds: Dataset, item: Item): DesiredVoucher | null {
  if (item.saleBooking !== 'individual' || !isSold(item)) return null;
  // Om en manuell försäljning redan är kopplad till plagget skapas inget automatiskt verifikat.
  if (ds.vouchers.some((v) => !v.deletedAt && v.source !== 'auto' && v.itemId === item.id)) return null;
  const vat = ds.settings.vatEnabled;
  const lines = vat ? eventLines('sale', item.salePrice, { enabled: true, included: true }) : [l(1930, item.salePrice, 0), l(3001, 0, item.salePrice)];
  return {
    key: `item:${item.id}:sale`,
    date: item.saleDate ?? '',
    text: `Försäljning: ${item.name}${item.platform ? ` (${item.platform})` : ''}${item.comment ? ` – ${item.comment}` : ''}`,
    lines,
    dropId: item.dropId,
    itemId: item.id,
  };
}

export function desiredAll(ds: Dataset): DesiredVoucher[] {
  const out: DesiredVoucher[] = [];
  const liveDrops = new Set(live(ds.drops).map((d) => d.id));
  for (const d of live(ds.drops)) out.push(...desiredForDrop(ds, d));
  for (const i of live(ds.items)) {
    if (!liveDrops.has(i.dropId)) continue;
    const v = desiredForItem(ds, i);
    if (v && v.date) out.push(v);
  }
  return out;
}

function l(account: Account, debit: Ore, credit: Ore): VoucherLine {
  return { account, debit, credit };
}

export interface LedgerDiff {
  create: DesiredVoucher[];
  update: { voucher: Voucher; desired: DesiredVoucher }[];
  remove: Voucher[];
}

/** Jämför önskade automatiska verifikat med befintliga. Exakt ett verifikat per nyckel. */
export function diffLedger(ds: Dataset): LedgerDiff {
  const desired = desiredAll(ds);
  const byKey = new Map<string, Voucher[]>();
  for (const v of ds.vouchers) {
    if (v.deletedAt || v.source !== 'auto' || !v.key) continue;
    const arr = byKey.get(v.key) ?? [];
    arr.push(v);
    byKey.set(v.key, arr);
  }
  const diff: LedgerDiff = { create: [], update: [], remove: [] };
  const seen = new Set<string>();
  for (const d of desired) {
    seen.add(d.key);
    const existing = byKey.get(d.key) ?? [];
    if (!existing.length) diff.create.push(d);
    else {
      const [first, ...dups] = existing.sort((a, b) => a.nr - b.nr);
      const imported = first.updatedBy === 'import';
      const material =
        first.date !== d.date ||
        !(imported ? nearLines(first.lines, d.lines) : sameLines(first.lines, d.lines)) ||
        first.dropId !== d.dropId ||
        first.itemId !== d.itemId;
      // Importerade verifikat behåller sin text om inget belopp eller datum ändrats.
      const textOnly = !material && first.text !== d.text && first.updatedBy !== 'import';
      if (material || textOnly) diff.update.push({ voucher: first, desired: d });
      diff.remove.push(...dups);
    }
  }
  for (const [key, vs] of byKey) if (!seen.has(key)) diff.remove.push(...vs);
  return diff;
}

export function sameLines(a: VoucherLine[], b: VoucherLine[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x.account === b[i].account && x.debit === b[i].debit && x.credit === b[i].credit);
}

/** Som sameLines men tillåter avrundningsskillnader under 1 kr per rad (v14 sparade delar av ören). */
export function nearLines(a: VoucherLine[], b: VoucherLine[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x.account === b[i].account && Math.abs(x.debit - b[i].debit) < 100 && Math.abs(x.credit - b[i].credit) < 100);
}

export function nextVoucherNr(vouchers: Voucher[]): number {
  return vouchers.reduce((m, v) => Math.max(m, v.nr || 0), 0) + 1;
}

// ---------- Huvudbok och saldon ----------

export interface AccountBalance {
  account: Account;
  name: string;
  debit: Ore;
  credit: Ore;
  balance: Ore;
}

export function trialBalance(vouchers: Voucher[], filter?: (v: Voucher) => boolean): AccountBalance[] {
  const m = new Map<number, AccountBalance>();
  for (const v of vouchers) {
    if (v.deletedAt || (filter && !filter(v))) continue;
    for (const x of v.lines) {
      const b = m.get(x.account) ?? { account: x.account, name: accountName(x.account), debit: 0, credit: 0, balance: 0 };
      b.debit += x.debit;
      b.credit += x.credit;
      b.balance = b.debit - b.credit;
      m.set(x.account, b);
    }
  }
  return [...m.values()].sort((a, b) => a.account - b.account);
}

export function accountTotals(vouchers: Voucher[]): Record<number, Ore> {
  const o: Record<number, Ore> = {};
  for (const b of trialBalance(vouchers)) o[b.account] = b.balance;
  return o;
}

// ---------- Dubbletter ----------

/** Plock ut ett plagg-ID i stil med "TS-Gar-2026-167" -> "167" */
export function garmentId(t: string | null | undefined): string {
  const m = String(t ?? '').match(/gar-?\d{4}-?(\d{2,4})/i);
  return m ? m[1] : '';
}

export interface DuplicateSale {
  voucher: Voucher;
  item: Item;
  reason: string;
}

/**
 * Manuellt bokförda försäljningar som troligen redan finns via ett plagg.
 * Matchar på samma belopp och (samma plagg-ID eller plaggets namn i texten) eller samma belopp och datum.
 */
export function findDuplicateSales(ds: Dataset): DuplicateSale[] {
  const out: DuplicateSale[] = [];
  const sold = live(ds.items).filter(isSold);
  const used = new Set<string>();
  for (const v of ds.vouchers) {
    if (v.deletedAt || v.source === 'auto' || v.itemId || v.dropId) continue;
    const amt = saleAmount(v);
    if (amt <= 0) continue;
    for (const it of sold) {
      if (used.has(v.id)) break;
      if (Math.abs(it.salePrice - amt) >= 50) continue;
      const vid = garmentId(v.text);
      const iid = garmentId(it.comment);
      const byId = vid && iid && vid === iid;
      const byName = !vid && v.text.toLowerCase().includes(it.name.toLowerCase());
      const byDate = it.saleDate === v.date;
      if (byId || byName || (byDate && it.saleBooking === 'individual')) {
        out.push({ voucher: v, item: it, reason: byId ? 'samma plagg-ID och belopp' : byName ? 'samma namn och belopp' : 'samma datum och belopp' });
        used.add(v.id);
      }
    }
  }
  return out;
}

/** Bokförda försäljningar som inte är kopplade till något plagg. */
export function unlinkedSales(ds: Dataset): Voucher[] {
  return ds.vouchers.filter((v) => !v.deletedAt && v.source !== 'auto' && !v.itemId && !v.dropId && saleAmount(v) > 0);
}
