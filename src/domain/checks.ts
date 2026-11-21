import { daysBetween } from './dates';
import { findDuplicateSales, isBalanced, unlinkedSales, voucherBalance, saleAmount } from './ledger';
import { allLanded, isSold, live } from './metrics';
import { kr } from './money';
import type { Dataset, ISODate } from './types';

export type Severity = 1 | 2 | 3;

export interface IssueRef {
  label: string;
  kind: 'item' | 'drop' | 'voucher';
  id: string;
  action?: 'removeDuplicate';
}

export interface IssueGroup {
  id: string;
  severity: Severity;
  title: string;
  hint: string;
  refs: IssueRef[];
  autoFix?: 'fillSaleDates';
}

/** Alla kontroller från v14 plus underlag. Allvar: 3 = fel i bokföringen, 2 = ger fel siffror, 1 = bör ses över. */
export function runChecks(ds: Dataset, today: ISODate): IssueGroup[] {
  const out: IssueGroup[] = [];
  const add = (g: Omit<IssueGroup, 'refs'> & { refs: IssueRef[] }) => {
    if (g.refs.length) out.push(g);
  };
  const L = allLanded(ds);
  const vouchers = live(ds.vouchers);

  add({
    id: 'unbalanced',
    severity: 3,
    title: 'Verifikat där debet inte är lika med kredit',
    hint: 'Rätta beloppen så att de balanserar.',
    refs: vouchers.filter((v) => !isBalanced(v.lines)).map((v) => ({ kind: 'voucher', id: v.id, label: `V${v.nr} · ${v.date} · ${v.text} (differens ${kr(voucherBalance(v.lines), { decimals: true })})` })),
  });

  add({
    id: 'duplicates',
    severity: 3,
    title: 'Möjliga dubbletter i bokföringen',
    hint: 'Samma försäljning verkar vara bokförd både manuellt och via plagget, så intäkten räknas två gånger.',
    refs: findDuplicateSales(ds).map((d) => ({
      kind: 'voucher',
      id: d.voucher.id,
      label: `V${d.voucher.nr} ${d.voucher.text} · ${kr(saleAmount(d.voucher))} (${d.reason} som ${d.item.name})`,
      action: 'removeDuplicate',
    })),
  });

  add({
    id: 'marked-wrong',
    severity: 3,
    title: 'Markerade som fel',
    hint: 'Rätta siffrorna och markera som stämmer.',
    refs: [
      ...L.filter((l) => l.item.ok === 2).map((l) => ({ kind: 'item' as const, id: l.item.id, label: `${l.item.name} · ${l.drop.name}` })),
      ...live(ds.drops).filter((d) => d.ok === 2).map((d) => ({ kind: 'drop' as const, id: d.id, label: d.name })),
      ...vouchers.filter((v) => v.ok === 2).map((v) => ({ kind: 'voucher' as const, id: v.id, label: `V${v.nr} ${v.text}` })),
    ],
  });

  add({
    id: 'sold-no-date',
    severity: 2,
    title: 'Sålda plagg utan säljdatum',
    hint: 'Utan datum hamnar försäljningen fel i månadsanalysen.',
    refs: L.filter((l) => isSold(l.item) && !l.item.saleDate).map((l) => ({ kind: 'item', id: l.item.id, label: `${l.item.name} · ${l.drop.name}` })),
    autoFix: 'fillSaleDates',
  });

  add({
    id: 'missing-ship-customs',
    severity: 2,
    title: 'Frakt eller tull saknas',
    hint: 'Utan dem blir vinsten för hög. Gäller drops som är hemma.',
    refs: live(ds.drops)
      .filter((d) => d.status === 'hemma' && d.date >= '2026-10-01' && ds.items.some((i) => i.dropId === d.id && !i.deletedAt) && (!d.shipping || !d.customs))
      .map((d) => ({ kind: 'drop', id: d.id, label: `${d.name} · frakt ${kr(d.shipping)} · tull ${kr(d.customs)}` })),
  });

  add({
    id: 'unlinked-sales',
    severity: 2,
    title: 'Bokförda försäljningar utan plagg',
    hint: 'Koppla dem till ett plagg så stämmer lager och analys.',
    refs: unlinkedSales(ds).map((v) => ({ kind: 'voucher', id: v.id, label: `V${v.nr} ${v.text} · ${v.date}` })),
  });

  add({
    id: 'no-cost',
    severity: 1,
    title: 'Plagg utan inköpspris',
    hint: 'Priset 0 kr ger fel kostnad och ROI.',
    refs: L.filter((l) => !(l.item.cost > 0)).map((l) => ({ kind: 'item', id: l.item.id, label: `${l.item.name} · ${l.drop.name}` })),
  });

  add({
    id: 'no-weight',
    severity: 1,
    title: 'Plagg utan vikt i drops med frakt',
    hint: 'Frakten fördelas på vikt, så vikt behövs.',
    refs: L.filter((l) => l.drop.shipping > 0 && !(l.item.weightKg > 0)).map((l) => ({ kind: 'item', id: l.item.id, label: `${l.item.name} · ${l.drop.name}` })),
  });

  add({
    id: 'below-cost',
    severity: 1,
    title: 'Sålda under kostnaden',
    hint: 'Kontrollera att priserna stämmer.',
    refs: L.filter((l) => isSold(l.item) && l.item.salePrice < l.landed * 0.8).map((l) => ({
      kind: 'item',
      id: l.item.id,
      label: `${l.item.name} · såld ${kr(l.item.salePrice)} · kostnad ${kr(l.landed)}`,
    })),
  });

  add({
    id: 'old-stock',
    severity: 1,
    title: 'Osålda i över 60 dagar',
    hint: 'Kapital som ligger bundet. Överväg att publicera om eller ändra annonsen.',
    refs: L.filter((l) => !isSold(l.item) && daysBetween(l.drop.date, today) > 60)
      .sort((a, b) => (a.drop.date < b.drop.date ? -1 : 1))
      .map((l) => ({ kind: 'item', id: l.item.id, label: `${l.item.name} · ${daysBetween(l.drop.date, today)} dagar · ${kr(l.landed)}` })),
  });

  if (ds.settings.attachmentsFlag) {
    const since = ds.settings.migratedAt ?? '';
    const withAtt = new Set(live(ds.attachments).map((a) => a.voucherId).filter(Boolean) as string[]);
    add({
      id: 'no-attachment',
      severity: 1,
      title: 'Verifikat utan underlag',
      hint: 'Bifoga kvitto, orderbekräftelse eller tullfaktura. Gäller verifikat skapade i Jarvis 2.0.',
      refs: vouchers
        .filter((v) => v.source !== 'v14' && v.updatedBy !== 'import' && v.createdAt > since && !withAtt.has(v.id))
        .filter((v) => !(v.source === 'auto' && v.key?.includes(':sales:')))
        .map((v) => ({ kind: 'voucher', id: v.id, label: `V${v.nr} · ${v.date} · ${v.text}` })),
    });
  }
  return out;
}

/** Hälsopoäng 0–100, samma viktning som v14. */
export function healthScore(groups: IssueGroup[]): number {
  let p = 0;
  for (const g of groups) {
    const cap = g.severity === 3 ? 40 : g.severity === 2 ? 25 : 12;
    const per = g.severity === 3 ? 8 : g.severity === 2 ? 4 : 1;
    p += Math.min(cap, g.refs.length * per);
  }
  return Math.max(0, Math.round(100 - p));
}
