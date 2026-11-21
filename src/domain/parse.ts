import { DEFAULT_WEIGHT } from './calc';
import { parseKr, toOre } from './money';
import { todayISO } from './dates';
import { CATEGORIES, type Category, type EventType, type ISODate, type Ore, type Platform } from './types';

/** Gissa kategori från plaggets namn (samma regler som v14, utökade). */
export function guessCategory(name: string): Category {
  const s = name.toLowerCase();
  if (/t-?shirt|tshirt|\btee\b|tisha/.test(s)) return 'T-shirts';
  if (/jacket|jacka|overshirt|coat|parka|bomber|ulljacka|kavaj|blazer|väst|vest\b/.test(s)) return 'Jackor';
  if (/hood|sweat|knit|tröja|pullover|zip|longsleeve|cardigan|v-neck|henley|stickad/.test(s)) return 'Tröjor';
  if (/skjorta|shirt/.test(s)) return 'Skjortor';
  if (/shorts|byxor|chino|cargo|trouser/.test(s) && !/jean/.test(s)) return 'Byxor';
  if (/\bsko\b|skor|shoe|sneaker|boot\b|boots|kängor/.test(s)) return 'Skor';
  if (/jean|denim|nudie|levi|501|505|slim jim|thin finn|thinn finn|selvedge|edwin|momotaro|a\.p\.c|apc|rrl|eternal|naked|bootcut|grim tim|steady eddie|average joe/.test(s))
    return 'Jeans';
  return 'Övrigt';
}

export interface ParsedRow {
  name: string;
  category: Category;
  cost: Ore;
  weightKg: number;
}

/**
 * Tolka inklistrade rader till plagg.
 * "11x Nudie jeans 132,19" -> 11 plagg à 132,19 kr
 * "A&F tröja; Tröjor; 150"  -> kategori efter semikolon
 * "Burberry t-shirt 215"    -> kategori gissas
 */
export function parseLines(text: string): ParsedRow[] {
  const out: ParsedRow[] = [];
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (!line) continue;
    let n = 1;
    const m = line.match(/^(\d+)\s*[x×]\s*(.+)$/i);
    if (m) {
      n = +m[1];
      line = m[2];
    }
    const cells = line.split(/\t|;|\|/).map((c) => c.trim());
    let name = '';
    let price = 0;
    let cat: Category | '' = '';
    if (cells.length > 1) {
      name = cells[0];
      for (const c of cells.slice(1)) {
        const cc = CATEGORIES.find((z) => z.toLowerCase() === c.toLowerCase());
        if (cc) cat = cc;
        else if (/^\d[\d\s.,]*(kr|:-|sek)?$/i.test(c)) price = parseKr(c);
      }
    } else {
      // Priset är sista talet på raden. "1 300" tolkas som tusental, men "501 150" som modell + pris.
      const pm = line.match(/^(.*?)[\s:,-]+(?:(\d{1,2})\s)?(\d+(?:[.,]\d{1,2})?)\s*(kr|:-|sek)?$/i);
      if (pm) {
        const thousands = !!pm[2] && pm[2].length === 1 && /^\d{3}([.,]|$)/.test(pm[3]);
        name = thousands ? pm[1] : `${pm[1]}${pm[2] ? ` ${pm[2]}` : ''}`;
        price = parseKr(thousands ? `${pm[2]}${pm[3]}` : pm[3]);
      } else name = line;
    }
    name = name.replace(/[\s,;:-]+$/, '');
    if (!name) continue;
    const category = cat || guessCategory(name);
    for (let i = 0; i < Math.min(n, 200); i++) out.push({ name, category, cost: toOre(price), weightKg: DEFAULT_WEIGHT[category] });
  }
  return out;
}

// ---------- Mejltext -> utkast ----------

export interface MailDraft {
  source: 'Vinted' | 'Plick' | 'Doorzo' | 'Bank' | 'Okänd';
  eventType: EventType;
  amount: Ore;
  date: ISODate;
  title: string;
  platform: Platform | null;
  itemHint: string;
  confidence: number;
}

const SV_MONTHS: Record<string, number> = {
  jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, mars: 3, apr: 4, april: 4, maj: 5, jun: 6, juni: 6,
  jul: 7, juli: 7, aug: 8, augusti: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, nov: 11, november: 11, dec: 12, december: 12,
  january: 1, february: 2, march: 3, may: 5, june: 6, july: 7, august: 8, october: 10,
};

export function findDate(text: string, fallback: ISODate = todayISO()): ISODate {
  const iso = text.match(/(20\d{2})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const sv = text.match(/(\d{1,2})\s+([a-zåäö]{3,9})\.?\s+(20\d{2})/i);
  if (sv && SV_MONTHS[sv[2].toLowerCase()]) return `${sv[3]}-${String(SV_MONTHS[sv[2].toLowerCase()]).padStart(2, '0')}-${sv[1].padStart(2, '0')}`;
  const dmy = text.match(/(\d{1,2})[./](\d{1,2})[./](20\d{2})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return fallback;
}

/** Alla belopp i texten (kr/SEK), i ören. */
export function findAmounts(text: string): Ore[] {
  const out: Ore[] = [];
  const re = /(?:SEK|kr)\s*(\d[\d\s.]*,?\d{0,2})|(\d[\d\s.]*,?\d{0,2})\s*(?:kr|SEK|:-)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const v = parseKr(m[1] ?? m[2]);
    if (v > 0) out.push(toOre(v));
  }
  return out;
}

function labeledAmount(text: string, labels: RegExp): Ore | null {
  const lines = text.split(/\n/);
  for (const l of lines) {
    if (labels.test(l)) {
      const a = findAmounts(l);
      if (a.length) return a[a.length - 1];
    }
  }
  return null;
}

/** Tolka inklistrad mejltext från Vinted, Plick, Doorzo eller banken till ett förslag. Användaren godkänner alltid. */
export function parseMail(text: string, today: ISODate = todayISO()): MailDraft {
  const t = text.toLowerCase();
  const date = findDate(text, today);
  const amounts = findAmounts(text);
  const max = amounts.length ? Math.max(...amounts) : 0;
  const itemHint = (text.match(/(?:artikel|item|plagg|vara|annons)[:\s]+(.+)/i)?.[1] ?? '').trim().slice(0, 80);

  if (/vinted/.test(t)) {
    const sold = /(sålt|sold|har köpts|du har sålt|pengar.*(överförts|tillgängliga)|utbetalning|payout|transfer)/.test(t);
    const amt = labeledAmount(text, /(total|summa|belopp|du får|överför|utbetal|amount)/i) ?? max;
    return { source: 'Vinted', eventType: sold ? 'sale' : 'platformfee', amount: amt, date, title: sold ? `Vinted-försäljning${itemHint ? `: ${itemHint}` : ''}` : 'Vinted', platform: 'Vinted', itemHint, confidence: sold ? 0.8 : 0.4 };
  }
  if (/plick/.test(t)) {
    const sold = /(sålt|sold|köpt|utbetal|swish|betalning mottagen)/.test(t);
    const amt = labeledAmount(text, /(total|summa|belopp|du får|utbetal)/i) ?? max;
    return { source: 'Plick', eventType: sold ? 'sale' : 'platformfee', amount: amt, date, title: sold ? `Plick-försäljning${itemHint ? `: ${itemHint}` : ''}` : 'Plick', platform: 'Plick', itemHint, confidence: sold ? 0.8 : 0.4 };
  }
  if (/doorzo/.test(t)) {
    if (/(customs|tull|duty|import tax|importmoms)/.test(t)) {
      const amt = labeledAmount(text, /(customs|tull|duty|tax|moms)/i) ?? max;
      return { source: 'Doorzo', eventType: 'customs', amount: amt, date, title: 'Tull och importmoms (Doorzo)', platform: null, itemHint, confidence: 0.75 };
    }
    if (/(shipping|frakt|international|parcel|package|paket|ems|dhl|fedex)/.test(t)) {
      const amt = labeledAmount(text, /(shipping|frakt|total)/i) ?? max;
      return { source: 'Doorzo', eventType: 'shipping', amount: amt, date, title: 'Frakt (Doorzo)', platform: null, itemHint, confidence: 0.75 };
    }
    const amt = labeledAmount(text, /(total|summa|amount|payment)/i) ?? max;
    return { source: 'Doorzo', eventType: 'purchase', amount: amt, date, title: 'Inköp (Doorzo)', platform: null, itemHint, confidence: 0.6 };
  }
  if (/(avgift|fee|månadsavgift|kontoavgift)/.test(t) && /(bank|swish|kort)/.test(t)) {
    return { source: 'Bank', eventType: 'bankfee', amount: max, date, title: 'Bankavgift', platform: null, itemHint: '', confidence: 0.5 };
  }
  return { source: 'Okänd', eventType: amounts.length ? 'sale' : 'material', amount: max, date, title: 'Inklistrad text', platform: null, itemHint, confidence: 0.2 };
}

/** Enkel CSV-läsare som klarar semikolon/komma och citattecken. */
export function parseCsv(text: string): string[][] {
  const first = text.split('\n')[0] ?? '';
  const sep = (first.match(/;/g)?.length ?? 0) >= (first.match(/,/g)?.length ?? 0) ? ';' : first.includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows.map((r) => r.map((x) => x.replace(/^﻿/, '').trim()));
}
