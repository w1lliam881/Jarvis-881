import { accountName, trialBalance } from './ledger';
import { allLanded, isSold, live } from './metrics';
import type { Dataset, Voucher } from './types';

const n2 = (ore: number) => (ore / 100).toFixed(2).replace('.', ',');

/** CSV med semikolon och BOM så att Excel och Google Sheets öppnar svenska tecken rätt. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return (
    '﻿' +
    rows
      .map((r) =>
        r
          .map((c) => {
            const s = String(c ?? '');
            return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(';'),
      )
      .join('\r\n')
  );
}

export function itemsCsv(ds: Dataset): string {
  const rows: (string | number)[][] = [
    ['Drop', 'Dropdatum', 'Plagg', 'Kategori', 'Märke', 'Storlek', 'Inköp', 'Vikt kg', 'Andel frakt', 'Andel tull', 'Förpackning', 'Hemkostnad', 'Såld för', 'Säljdatum', 'Plattform', 'Vinst', 'Kommentar'],
  ];
  for (const l of allLanded(ds)) {
    const x = l.item;
    rows.push([
      l.drop.name,
      l.drop.date,
      x.name,
      x.category,
      x.brand,
      x.size,
      n2(x.cost),
      String(x.weightKg).replace('.', ','),
      n2(l.shippingShare),
      n2(l.customsShare),
      n2(l.packaging),
      n2(l.landed),
      isSold(x) ? n2(x.salePrice) : '',
      x.saleDate ?? '',
      x.platform ?? '',
      l.profit != null ? n2(l.profit) : '',
      x.comment,
    ]);
  }
  return toCsv(rows);
}

export function vouchersCsv(ds: Dataset): string {
  const rows: (string | number)[][] = [['Nr', 'Datum', 'Text', 'Konto', 'Kontonamn', 'Debet', 'Kredit', 'Typ']];
  for (const v of sortedVouchers(ds.vouchers))
    for (const l of v.lines) rows.push([v.nr, v.date, v.text, l.account, accountName(l.account), l.debit ? n2(l.debit) : '', l.credit ? n2(l.credit) : '', sourceLabel(v)]);
  return toCsv(rows);
}

export function ledgerCsv(ds: Dataset, year: string): string {
  const rows: (string | number)[][] = [['Konto', 'Kontonamn', 'Debet', 'Kredit', 'Saldo']];
  for (const b of trialBalance(ds.vouchers, (v) => v.date.startsWith(year))) rows.push([b.account, b.name, n2(b.debit), n2(b.credit), n2(b.balance)]);
  return toCsv(rows);
}

export function sourceLabel(v: Voucher): string {
  return v.source === 'auto' ? 'Automatisk' : v.source === 'event' ? 'Händelse' : v.source === 'manual' ? 'Manuell' : 'Från v14';
}

export function sortedVouchers(vs: Voucher[]): Voucher[] {
  return live(vs)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.nr - b.nr));
}

// ---------- SIE typ 4 ----------

// CP437 (PC8) för tecken utanför ASCII, som SIE-standarden kräver.
const CP437: Record<string, number> = {
  Ç: 0x80, ü: 0x81, é: 0x82, â: 0x83, ä: 0x84, à: 0x85, å: 0x86, ç: 0x87, ê: 0x88, ë: 0x89, è: 0x8a, ï: 0x8b, î: 0x8c, ì: 0x8d, Ä: 0x8e, Å: 0x8f,
  É: 0x90, æ: 0x91, Æ: 0x92, ô: 0x93, ö: 0x94, ò: 0x95, û: 0x96, ù: 0x97, ÿ: 0x98, Ö: 0x99, Ü: 0x9a, ø: 0x9b, '£': 0x9c, Ø: 0x9d, á: 0xa0, í: 0xa1,
  ó: 0xa2, ú: 0xa3, ñ: 0xa4, Ñ: 0xa5, '§': 0x15, '–': 0x2d, '—': 0x2d, '’': 0x27, '‘': 0x27, '“': 0x22, '”': 0x22, '·': 0xfa, '×': 0x78,
};

export function encodeCp437(s: string): Uint8Array<ArrayBuffer> {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c < 128) out.push(c);
    else out.push(CP437[ch] ?? 0x3f);
  }
  return new Uint8Array(out);
}

const q = (s: string) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const sieAmt = (ore: number) => (ore / 100).toFixed(2);
const d8 = (iso: string) => iso.replace(/-/g, '');

/** SIE 4-fil (som text) för ett räkenskapsår. Läses av alla svenska bokföringsprogram. */
export function sie4(ds: Dataset, year: string, generated: string): string {
  const all = live(ds.vouchers);
  const inYear = all.filter((v) => v.date.startsWith(year));
  const before = all.filter((v) => v.date < `${year}-01-01`);
  const accounts = new Set<number>();
  for (const v of all) for (const l of v.lines) accounts.add(l.account);
  if (before.length) accounts.add(2010);
  const lines: string[] = [
    '#FLAGGA 0',
    '#PROGRAM "Jarvis" 2.0',
    '#FORMAT PC8',
    `#GEN ${d8(generated)}`,
    '#SIETYP 4',
    `#FNAMN ${q(ds.settings.companyName || '881')}`,
    `#RAR 0 ${year}0101 ${year}1231`,
    '#KPTYP BAS2014',
  ];
  for (const a of [...accounts].sort((x, y) => x - y)) {
    lines.push(`#KONTO ${a} ${q(accountName(a))}`);
    lines.push(`#KTYP ${a} ${a < 2000 ? 'T' : a < 3000 ? 'S' : a < 4000 ? 'I' : 'K'}`);
  }
  // Ingående balans för balanskonton = utgående balans från tidigare år
  const ib = new Map<number, number>();
  for (const v of before) for (const l of v.lines) if (l.account < 3000) ib.set(l.account, (ib.get(l.account) ?? 0) + l.debit - l.credit);
  // Tidigare års resultat förs över till eget kapital (2010) så att ingående balans går jämnt ut
  const ibSum = [...ib.values()].reduce((a, b) => a + b, 0);
  if (ibSum !== 0) ib.set(2010, (ib.get(2010) ?? 0) - ibSum);
  const ub = new Map(ib);
  const res = new Map<number, number>();
  for (const v of inYear)
    for (const l of v.lines) {
      const m = l.account < 3000 ? ub : res;
      m.set(l.account, (m.get(l.account) ?? 0) + l.debit - l.credit);
    }
  for (const [a, b] of [...ib].sort((x, y) => x[0] - y[0])) lines.push(`#IB 0 ${a} ${sieAmt(b)}`);
  for (const [a, b] of [...ub].sort((x, y) => x[0] - y[0])) lines.push(`#UB 0 ${a} ${sieAmt(b)}`);
  for (const [a, b] of [...res].sort((x, y) => x[0] - y[0])) lines.push(`#RES 0 ${a} ${sieAmt(b)}`);
  for (const v of sortedVouchers(inYear)) {
    lines.push(`#VER "" ${v.nr} ${d8(v.date)} ${q(v.text)}`);
    lines.push('{');
    for (const l of v.lines) {
      const amt = l.debit - l.credit;
      if (amt !== 0) lines.push(`   #TRANS ${l.account} {} ${sieAmt(amt)}`);
    }
    lines.push('}');
  }
  return lines.join('\r\n') + '\r\n';
}

/** Fullständig säkerhetskopia (allt utom filinnehåll). */
export function backupJson(ds: Dataset): string {
  return JSON.stringify({ format: 'jarvis-2', exportedAt: new Date().toISOString(), data: ds }, null, 1);
}
