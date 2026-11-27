// Doorzo-länk -> plagg. Allt läses ur själva länken (titel, pris i yen, Mercari-ID, bild),
// så Jarvis behöver aldrig hämta Doorzo-sidan. Ren funktion, ingen nätverkstrafik.
import { DEFAULT_WEIGHT } from './calc';
import { BRANDS, inferBrand } from './doorzo';
import { guessCategory } from './parse';
import type { Category, Ore } from './types';

export interface DoorzoItem {
  /** Plaggets namn i Jarvis, t.ex. "Levi's 511 W29 L32" */
  name: string;
  brand: string;
  model: string;
  size: string;
  category: Category;
  weightKg: number;
  /** Pris i yen enligt länken (utan Doorzos avgifter och frakt). */
  priceYen: number | null;
  /** Ungefärligt pris i kronor (ören) med kursen i inställningarna. */
  cost: Ore;
  /** Originaltiteln från Mercari. */
  title: string;
  /** Titeln med japanska ord översatta. */
  titleSv: string;
  /** Detaljer som hittats, t.ex. "Made in USA", "Selvedge (röd kant)". */
  details: string[];
  mercariId: string;
  mercariUrl: string;
  imageUrl: string;
  sourceUrl: string;
}

/** Japanska ord som ofta står i titlar, med svensk/engelsk betydelse. Längsta först vid ersättning. */
const JA: [string, string, string?][] = [
  // [japanska, ersättning i titeln, detalj att visa]
  ['USA製', 'Made in USA', 'Made in USA'],
  ['アメリカ製', 'Made in USA', 'Made in USA'],
  ['米国製', 'Made in USA', 'Made in USA'],
  ['日本製', 'Made in Japan', 'Made in Japan'],
  ['メキシコ製', 'Made in Mexico', 'Made in Mexico'],
  ['イタリア製', 'Made in Italy', 'Made in Italy'],
  ['ホワイトオーク', 'White Oak', 'White Oak-denim (Cone Mills)'],
  ['WHITE OAK製', 'White Oak', 'White Oak-denim (Cone Mills)'],
  ['赤耳', 'selvedge', 'Selvedge (röd kant)'],
  ['セルビッジ', 'selvedge', 'Selvedge'],
  ['セルヴィッジ', 'selvedge', 'Selvedge'],
  ['ビッグE', 'Big E', 'Big E'],
  ['オレンジタブ', 'orange tab', 'Orange tab'],
  ['濃紺', 'dark indigo', 'Mörk tvätt'],
  ['未使用', 'unused', 'Oanvänd'],
  ['美品', 'good condition', 'Fint skick'],
  ['ヴィンテージ', 'vintage', 'Vintage'],
  ['ビンテージ', 'vintage', 'Vintage'],
  ['古着', 'vintage', 'Vintage'],
  ['デニムジャケット', 'denim jacket'],
  ['Gジャン', 'denim jacket'],
  ['デニムパンツ', 'jeans'],
  ['ジーンズ', 'jeans'],
  ['ジーパン', 'jeans'],
  ['デニム', 'denim'],
  ['ジャケット', 'jacket'],
  ['ブルゾン', 'jacket'],
  ['コート', 'coat'],
  ['パーカー', 'hoodie'],
  ['スウェット', 'sweat'],
  ['トレーナー', 'sweat'],
  ['ニット', 'knit'],
  ['セーター', 'knit'],
  ['カーディガン', 'cardigan'],
  ['Tシャツ', 't-shirt'],
  ['ネルシャツ', 'flannel shirt'],
  ['シャツ', 'shirt'],
  ['チノパン', 'chino'],
  ['ショーツ', 'shorts'],
  ['ハーフパンツ', 'shorts'],
  ['パンツ', 'trousers'],
  ['ブーツ', 'boots'],
  ['スニーカー', 'sneaker'],
  ['ブラック', 'black'],
  ['ホワイト', 'white'],
  ['インディゴ', 'indigo'],
  ['スリム', 'slim'],
  ['ストレート', 'straight'],
  ['ブーツカット', 'bootcut'],
  ['メンズ', 'men'],
  ['レディース', 'women'],
  ['製', ''],
];

/** Kända modellnamn (utöver tresiffriga Levi's-nummer). */
const MODELS = ['Grim Tim', 'Steady Eddie', 'Thin Finn', 'Lean Dean', 'Slim Jim', 'Average Joe', 'Tight Terry', 'Petit New Standard', 'Petit Standard', 'New Standard', 'Rescue', 'Trucker', 'Type III', 'Type II', '501XX', '66'];

function translate(title: string): string {
  let t = title;
  for (const [ja, sv] of JA) t = t.split(ja).join(` ${sv} `);
  return t.replace(/\s+/g, ' ').trim();
}

function brandFrom(title: string, translated: string): string {
  const b = inferBrand(translated) || inferBrand(title);
  if (b) return b;
  for (const br of BRANDS) if (br.ja.some((t) => /[^\x00-\x7F]/.test(t.ja) && title.includes(t.ja))) return br.name;
  for (const br of BRANDS) for (const w of br.jeansWords ?? []) if (title.includes(w.ja) && /^[A-Z]/.test(w.sv)) return br.name;
  return '';
}

function sizeFrom(t: string): string {
  const s = t.replace(/[Ｗｗ]/g, 'W').replace(/[Ｌｌ]/g, 'L');
  const wl = s.match(/W\s?(\d{2})(?:\s*[×xX/\s]?\s*L\s?(\d{2}))?/);
  if (wl) return `W${wl[1]}${wl[2] ? ` L${wl[2]}` : ''}`;
  const inch = s.match(/(\d{2})\s?(?:インチ|inch)/i);
  if (inch) return `W${inch[1]}`;
  const sz = s.match(/(?:サイズ|size)\s*[:：]?\s*(XXL|XL|XS|S|M|L|\d{1,2})\b/i);
  if (sz) return sz[1].toUpperCase();
  const lone = s.match(/(?:^|\s)(XXL|XL|XS|S|M|L)(?:\s|$)/);
  return lone ? lone[1] : '';
}

function modelFrom(t: string, brand: string): string {
  const lower = t.toLowerCase();
  for (const m of MODELS) if (lower.includes(m.toLowerCase())) return m;
  if (brand === "Levi's" || /levi/i.test(t)) {
    const n = t.match(/(?:^|[^\d])([5-9]\d{2}(?:XX|E)?)(?!\d)/);
    if (n) return n[1];
  }
  return '';
}

function hexDecode(h: string): string {
  if (!/^(?:[0-9a-f]{2})+$/i.test(h)) return '';
  try {
    return decodeURIComponent(h.replace(/../g, '%$&'));
  } catch {
    return '';
  }
}

/** Hittar alla Doorzo- eller Mercari-länkar i en text (en eller flera inklistrade). */
export function findLinks(text: string): string[] {
  return text.match(/https?:\/\/(?:www\.)?(?:doorzo\.com|jp\.mercari\.com|mercari\.com)\/\S+/gi) ?? [];
}

/**
 * Tolka en Doorzo-länk (eller Mercari-länk) till ett plagg.
 * yenPerSek: kursen i inställningarna (ungefärlig). Returnerar null om länken inte går att läsa.
 */
export function parseDoorzoLink(link: string, yenPerSek: number): DoorzoItem | null {
  let u: URL;
  try {
    u = new URL(link.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)(doorzo\.com|mercari\.com)$/i.test(u.hostname)) return null;
  const p = u.searchParams;
  const hex = u.pathname.split('/').find((seg) => seg.length > 20 && /^[0-9a-f]+$/i.test(seg)) ?? '';
  const inner = hexDecode(hex);
  const asin = p.get('Asin') ?? '';
  const mercariId = /^m\d+$/i.test(asin) ? asin : (`${inner} ${u.pathname}`.match(/\b(m\d{8,})\b/i)?.[1] ?? '');
  const title = (p.get('Title') ?? '').replace(/\s+/g, ' ').trim();
  const priceRaw = p.get('Price');
  const priceYen = priceRaw && /^\d+$/.test(priceRaw) ? Number(priceRaw) : null;
  const imageUrl = (p.get('Image') ?? '').startsWith('https://') ? (p.get('Image') as string) : '';
  if (!mercariId && !title) return null;

  const titleSv = translate(title);
  const brand = brandFrom(title, titleSv);
  const size = sizeFrom(title);
  const model = modelFrom(titleSv, brand);
  const category = guessCategory(`${titleSv} ${brand}`);
  const details = [...new Set(JA.filter(([ja, , d]) => d && title.includes(ja)).map(([, , d]) => d as string))];
  const name = [brand, model, size].filter(Boolean).join(' ') || titleSv.slice(0, 60) || `Mercari ${mercariId}`;
  const cost = priceYen != null && yenPerSek > 0 ? Math.round((priceYen * 100) / yenPerSek) : 0;
  return {
    name,
    brand,
    model,
    size,
    category,
    weightKg: DEFAULT_WEIGHT[category],
    priceYen,
    cost,
    title,
    titleSv,
    details,
    mercariId,
    mercariUrl: mercariId ? `https://jp.mercari.com/item/${mercariId}` : inner,
    imageUrl,
    sourceUrl: u.toString(),
  };
}

/** Kommentaren som sparas på plagget. */
export function doorzoComment(d: DoorzoItem): string {
  return [d.details.join(', '), d.priceYen != null ? `${d.priceYen.toLocaleString('sv-SE')} yen` : '', d.mercariId ? `Mercari ${d.mercariId}` : '', d.title ? `Titel: ${d.title}` : ''].filter(Boolean).join(' · ');
}

/**
 * Droppen nya Doorzo-plagg läggs i som standard: den senaste beställda droppen från de senaste 7 dagarna
 * (man handlar ofta en drop över flera dagar). Finns ingen: null = ny drop.
 */
export function openDoorzoDrop<T extends { id: string; date: string; status: string; deletedAt?: string | null }>(drops: T[], today: string): T | null {
  const from = new Date(Date.parse(`${today}T12:00:00Z`) - 7 * 864e5).toISOString().slice(0, 10);
  const open = drops.filter((d) => !d.deletedAt && d.status === 'beställd' && d.date >= from && d.date <= today);
  open.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return open[0] ?? null;
}

/** Hämtar Doorzo-/Mercari-länkar ur det som delats till appen (?url=…&text=…). */
export function sharedLinks(search: string): string {
  const p = new URLSearchParams(search);
  return findLinks([p.get('url'), p.get('text'), p.get('title')].filter(Boolean).join(' ')).join('\n');
}
