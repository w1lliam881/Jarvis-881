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
  /** Sajten plagget ligger på, t.ex. Mercari, Rakuma, Yahoo Auktioner. */
  store: string;
  /** Plaggets id på sajten (Mercari m123…, Yahoo x123…). */
  itemId: string;
  /** Samma som itemId (äldre namn). */
  mercariId: string;
  /** Länk direkt till plagget på sajten. */
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

/** Sajter Doorzo köper från (och Doorzo själv). Används för att känna igen länkar och visa var plagget kommer ifrån. */
const STORES: { re: RegExp; name: string }[] = [
  { re: /mercari/i, name: 'Mercari' },
  { re: /rakuma|fril\.jp/i, name: 'Rakuma' },
  { re: /paypayfleamarket|paypay/i, name: 'PayPay Flea' },
  { re: /yahoo|auctions/i, name: 'Yahoo Auktioner' },
  { re: /rakuten/i, name: 'Rakuten' },
  { re: /amazon/i, name: 'Amazon JP' },
  { re: /surugaya|suruga-ya/i, name: 'Surugaya' },
  { re: /2ndstreet/i, name: '2nd Street' },
  { re: /zozo/i, name: 'Zozotown' },
];
const HOSTS = /(?:[\w-]+\.)*(?:doorzo\.[a-z.]+|doorzo\.app\.link|mercari\.com|fril\.jp|rakuma\.rakuten\.co\.jp|paypayfleamarket\.yahoo\.co\.jp|(?:page\.)?auctions\.yahoo\.co\.jp|item\.rakuten\.co\.jp|amazon\.co\.jp|suruga-ya\.jp|2ndstreet\.jp|zozo\.jp)/i;
const LINK_RE = new RegExp(String.raw`(?:https?:\/\/)?${HOSTS.source}\/[^\s<>"'）】]*`, 'gi');

function normalizeUrl(raw: string): string {
  const t = raw.trim().replace(/[.,;:!?)\]]+$/, '');
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

/** Hittar alla Doorzo-länkar (och länkar till sajterna Doorzo köper från) i en text, även utan https://. */
export function findLinks(text: string): string[] {
  return findLinksWithHint(text).map((x) => x.url);
}

/**
 * Hittar länkarna och texten som står före varje länk på samma rad (t.ex. titeln i Doorzos delningstext).
 * En länk vars parametrar har okodade mellanslag ("&Title=Levi's 511&Price=3000") läses till radens slut.
 */
function findLinksWithHint(text: string): { url: string; hint: string }[] {
  const out: { url: string; hint: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const ms = [...line.matchAll(LINK_RE)];
    let last = 0;
    ms.forEach((m, i) => {
      const at = m.index ?? 0;
      let end = at + m[0].length;
      const next = i + 1 < ms.length ? (ms[i + 1].index ?? line.length) : line.length;
      if (m[0].includes('?') && /[&?][A-Za-z_]+=/.test(line.slice(end, next))) end = next;
      const raw = line.slice(at, end).trim().replace(/ /g, '%20');
      const hint = line
        .slice(last, at)
        .replace(/[【\[]?\s*doorzo\s*[】\]]?/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      out.push({ url: normalizeUrl(raw), hint });
      last = end;
    });
  }
  return out;
}

/** Läser en parameter oavsett stor/liten bokstav, och provar flera namn. */
function param(p: URLSearchParams, ...names: string[]): string {
  const want = names.map((n) => n.toLowerCase());
  for (const [k, v] of p) if (want.includes(k.toLowerCase()) && v.trim()) return v.trim();
  return '';
}

function decodeSegment(seg: string): string {
  const hex = hexDecode(seg);
  if (/^https?:\/\//i.test(hex)) return hex;
  try {
    const d = decodeURIComponent(seg);
    if (/^https?:\/\//i.test(d)) return d;
  } catch {
    /* inte kodad */
  }
  return '';
}

/** Plaggets id i butiken: Mercari m123…, Yahoo x123…, annars sista delen av adressen. */
function itemIdFrom(...urls: string[]): string {
  const all = urls.filter(Boolean).join(' ');
  const mer = all.match(/\b(m\d{8,})\b/i);
  if (mer) return mer[1];
  const yah = all.match(/\b([a-z]\d{9,11})\b/i);
  if (yah) return yah[1];
  for (const u of urls) {
    if (!u) continue;
    try {
      const segs = new URL(u).pathname.split('/').filter((x) => x && !/^(item|items|detail|goods|product|jp|en|zh-hk|zh-tw|ko|auction|mall|shop|shops|dp|gp)$/i.test(x));
      const last = segs[segs.length - 1];
      if (last && last.length <= 40 && !/^[0-9a-f]{40,}$/i.test(last)) return last;
    } catch {
      /* ogiltig */
    }
  }
  return '';
}

function priceFrom(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/[¥￥円,\s]/g, '').replace(/\.\d+$/, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/**
 * Tolka en Doorzo-länk (eller länk till Mercari, Rakuma, Yahoo m.fl.) till ett plagg.
 * Returnerar null bara om texten inte är en sådan länk. Saknas uppgifter i länken
 * läggs plagget ändå in med länken sparad, och det som saknas fylls i för hand.
 * hint: text som stod före länken (t.ex. titeln i Doorzos delningstext).
 */
export function parseDoorzoLink(link: string, yenPerSek: number, hint = ''): DoorzoItem | null {
  let u: URL;
  try {
    u = new URL(normalizeUrl(link));
  } catch {
    return null;
  }
  if (!HOSTS.test(u.hostname) || !new RegExp(`^${HOSTS.source}$`, 'i').test(u.hostname)) return null;
  const p = u.searchParams;
  const inner = u.pathname.split('/').map(decodeSegment).find(Boolean) ?? param(p, 'url', 'link', 'href');
  const storeSrc = `${inner} ${u.pathname} ${u.hostname}`;
  const store = STORES.find((x) => x.re.test(storeSrc))?.name ?? (/doorzo/i.test(u.hostname) ? 'Doorzo' : '');
  const asin = param(p, 'Asin', 'itemId', 'item_id', 'id', 'goodsId', 'code');
  const itemId = (asin && asin.length <= 40 ? asin : '') || itemIdFrom(inner, u.toString());
  const title = (param(p, 'Title', 'name', 'goodsName', 'keyword') || hint).replace(/\s+/g, ' ').trim();
  const priceYen = priceFrom(param(p, 'Price', 'price', 'jpy', 'yen'));
  const img = param(p, 'Image', 'img', 'imageUrl', 'pic');
  const imageUrl = img.startsWith('https://') ? img : itemId && /^m\d+$/i.test(itemId) ? `https://static.mercdn.net/item/detail/orig/photos/${itemId}_1.jpg` : '';

  const titleSv = translate(title);
  const brand = brandFrom(title, titleSv);
  const size = sizeFrom(title);
  const model = modelFrom(titleSv, brand);
  const category = guessCategory(`${titleSv} ${brand}`);
  const details = [...new Set(JA.filter(([ja, , d]) => d && title.includes(ja)).map(([, , d]) => d as string))];
  const name = [brand, model, size].filter(Boolean).join(' ') || titleSv.slice(0, 60) || [store || 'Doorzo', itemId].filter(Boolean).join(' ');
  const cost = priceYen != null && yenPerSek > 0 ? Math.round((priceYen * 100) / yenPerSek) : 0;
  const itemUrl = /^m\d+$/i.test(itemId) ? `https://jp.mercari.com/item/${itemId}` : inner || u.toString();
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
    store,
    itemId,
    mercariId: itemId,
    mercariUrl: itemUrl,
    imageUrl,
    sourceUrl: u.toString(),
  };
}

/** Alla plagg i en inklistrad text: en per länk. Samma plagg (samma id eller länk) tas bara med en gång. */
export function parseDoorzoText(text: string, yenPerSek: number): DoorzoItem[] {
  const byKey = new Map<string, DoorzoItem>();
  const info = (d: DoorzoItem) => (d.title ? 2 : 0) + (d.priceYen != null ? 2 : 0) + (d.imageUrl ? 1 : 0);
  for (const { url, hint } of findLinksWithHint(text)) {
    const d = parseDoorzoLink(url, yenPerSek, hint);
    if (!d) continue;
    const key = d.itemId || d.sourceUrl;
    const had = byKey.get(key);
    // Samma plagg två gånger: behåll den länk som har mest uppgifter
    if (!had || info(d) > info(had)) byKey.set(key, d);
  }
  return [...byKey.values()];
}

/** Kommentaren som sparas på plagget. */
export function doorzoComment(d: DoorzoItem): string {
  return [
    d.details.join(', '),
    d.priceYen != null ? `${d.priceYen.toLocaleString('sv-SE')} yen` : 'pris saknades i länken',
    d.itemId ? `${d.store || 'Doorzo'} ${d.itemId}` : d.store,
    d.title ? `Titel: ${d.title}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
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
