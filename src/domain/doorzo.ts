// Doorzo-sökningar utan AI: en ordlista svenska -> japanska med färdiga kombinationer.
// Varje japansk sökterm har en svensk förklaring bredvid.

export interface Term {
  ja: string;
  sv: string;
  tip?: string;
}

interface Brand {
  keys: string[];
  name: string;
  ja: Term[];
  jeansWords?: Term[];
}

export const BRANDS: Brand[] = [
  { keys: ['levis', "levi's", 'levi', 'levis'], name: "Levi's", ja: [{ ja: 'リーバイス', sv: "Levi's (katakana)" }, { ja: 'LEVIS', sv: "Levi's skrivet utan apostrof" }], jeansWords: [{ ja: 'ビッグE', sv: 'Big E (äldre röd lapp med stort E)', tip: 'Vintage före 1971' }, { ja: '赤耳', sv: 'Röd kant, selvedge (redline)' }, { ja: '501XX', sv: 'Modell 501XX (äldsta varianten)' }, { ja: 'オレンジタブ', sv: 'Orange lapp (70- och 80-tal)' }] },
  { keys: ['nudie', 'nudie jeans'], name: 'Nudie Jeans', ja: [{ ja: 'ヌーディージーンズ', sv: 'Nudie Jeans (katakana)' }, { ja: 'ヌーディー', sv: 'Nudie (kort)' }, { ja: 'nudie jeans', sv: 'Nudie Jeans på engelska' }], jeansWords: [{ ja: 'シンフィン', sv: 'Thin Finn' }, { ja: 'グリムティム', sv: 'Grim Tim' }, { ja: 'スティーディーエディ', sv: 'Steady Eddie' }, { ja: 'アベレージジョー', sv: 'Average Joe' }, { ja: 'スリムジム', sv: 'Slim Jim' }] },
  { keys: ['apc', 'a.p.c', 'a.p.c.'], name: 'A.P.C.', ja: [{ ja: 'アーペーセー', sv: 'A.P.C. uttalat (katakana)' }, { ja: 'A.P.C.', sv: 'A.P.C. på engelska' }], jeansWords: [{ ja: 'プチニュースタンダード', sv: 'Petit New Standard' }, { ja: 'プチスタンダード', sv: 'Petit Standard' }, { ja: 'ニュースタンダード', sv: 'New Standard' }] },
  { keys: ['rrl', 'double rl'], name: 'RRL', ja: [{ ja: 'ダブルアールエル', sv: 'RRL (Double RL) i katakana' }, { ja: 'RRL', sv: 'RRL på engelska' }] },
  { keys: ['momotaro'], name: 'Momotaro', ja: [{ ja: '桃太郎ジーンズ', sv: 'Momotaro Jeans (kanji)' }, { ja: '桃太郎', sv: 'Momotaro (kort)' }] },
  { keys: ['evisu'], name: 'Evisu', ja: [{ ja: 'エヴィス', sv: 'Evisu (katakana)' }, { ja: 'エビス', sv: 'Evisu, alternativ stavning' }] },
  { keys: ['edwin'], name: 'Edwin', ja: [{ ja: 'エドウィン', sv: 'Edwin (katakana)' }] },
  { keys: ['kapital'], name: 'Kapital', ja: [{ ja: 'キャピタル', sv: 'Kapital (katakana)' }, { ja: 'KAPITAL', sv: 'Kapital på engelska' }] },
  { keys: ['pure blue japan', 'pbj'], name: 'Pure Blue Japan', ja: [{ ja: 'ピュアブルージャパン', sv: 'Pure Blue Japan (katakana)' }] },
  { keys: ['samurai'], name: 'Samurai Jeans', ja: [{ ja: 'サムライジーンズ', sv: 'Samurai Jeans (katakana)' }] },
  { keys: ['iron heart'], name: 'Iron Heart', ja: [{ ja: 'アイアンハート', sv: 'Iron Heart (katakana)' }] },
  { keys: ['studio dartisan', "studio d'artisan", 'dartisan'], name: "Studio D'Artisan", ja: [{ ja: 'ステュディオダルチザン', sv: "Studio D'Artisan (katakana)" }, { ja: 'ダルチザン', sv: "D'Artisan (kort)" }] },
  { keys: ['eternal'], name: 'Eternal', ja: [{ ja: 'エターナル', sv: 'Eternal (katakana)' }] },
  { keys: ['orslow'], name: 'orSlow', ja: [{ ja: 'オアスロウ', sv: 'orSlow (katakana)' }] },
  { keys: ['big john'], name: 'Big John', ja: [{ ja: 'ビッグジョン', sv: 'Big John (katakana)' }] },
  { keys: ['lee'], name: 'Lee', ja: [{ ja: 'リー', sv: 'Lee (katakana)' }, { ja: 'Lee', sv: 'Lee på engelska' }] },
  { keys: ['wrangler'], name: 'Wrangler', ja: [{ ja: 'ラングラー', sv: 'Wrangler (katakana)' }] },
  { keys: ['carhartt'], name: 'Carhartt', ja: [{ ja: 'カーハート', sv: 'Carhartt (katakana)' }] },
  { keys: ['abercrombie', 'a&f', 'abercrombie & fitch', 'abercrombie&fitch'], name: 'Abercrombie & Fitch', ja: [{ ja: 'アバクロ', sv: 'Abercrombie (vanlig japansk förkortning)' }, { ja: 'アバクロンビー&フィッチ', sv: 'Abercrombie & Fitch (fullt namn)' }] },
  { keys: ['burberry', 'burberry black label'], name: 'Burberry', ja: [{ ja: 'バーバリー', sv: 'Burberry (katakana)' }, { ja: 'バーバリーブラックレーベル', sv: 'Burberry Black Label (bara Japan)' }] },
  { keys: ['barbour'], name: 'Barbour', ja: [{ ja: 'バブアー', sv: 'Barbour (katakana)' }, { ja: 'バブワー', sv: 'Barbour, alternativ stavning' }] },
  { keys: ['ralph lauren', 'polo', 'polo ralph lauren'], name: 'Ralph Lauren', ja: [{ ja: 'ラルフローレン', sv: 'Ralph Lauren (katakana)' }, { ja: 'ポロラルフローレン', sv: 'Polo Ralph Lauren' }] },
  { keys: ['stussy', 'stüssy'], name: 'Stüssy', ja: [{ ja: 'ステューシー', sv: 'Stüssy (katakana)' }, { ja: 'オールドステューシー', sv: 'Old Stüssy (äldre plagg)' }] },
  { keys: ['supreme'], name: 'Supreme', ja: [{ ja: 'シュプリーム', sv: 'Supreme (katakana)' }] },
  { keys: ['visvim'], name: 'visvim', ja: [{ ja: 'ビズビム', sv: 'visvim (katakana)' }] },
  { keys: ['neighborhood'], name: 'Neighborhood', ja: [{ ja: 'ネイバーフッド', sv: 'Neighborhood (katakana)' }] },
  { keys: ['wtaps'], name: 'WTAPS', ja: [{ ja: 'ダブルタップス', sv: 'WTAPS (katakana)' }] },
  { keys: ['comme des garcons', 'cdg', 'comme'], name: 'Comme des Garçons', ja: [{ ja: 'コムデギャルソン', sv: 'Comme des Garçons (katakana)' }, { ja: 'ギャルソン', sv: 'Garçons (kort)' }] },
  { keys: ['yohji', 'yohji yamamoto'], name: 'Yohji Yamamoto', ja: [{ ja: 'ヨウジヤマモト', sv: 'Yohji Yamamoto (katakana)' }] },
  { keys: ['issey', 'issey miyake'], name: 'Issey Miyake', ja: [{ ja: 'イッセイミヤケ', sv: 'Issey Miyake (katakana)' }] },
  { keys: ['patagonia'], name: 'Patagonia', ja: [{ ja: 'パタゴニア', sv: 'Patagonia (katakana)' }] },
  { keys: ['north face', 'the north face', 'tnf'], name: 'The North Face', ja: [{ ja: 'ノースフェイス', sv: 'The North Face (katakana)' }] },
  { keys: ['arcteryx', "arc'teryx"], name: "Arc'teryx", ja: [{ ja: 'アークテリクス', sv: "Arc'teryx (katakana)" }] },
  { keys: ['uniqlo'], name: 'Uniqlo', ja: [{ ja: 'ユニクロ', sv: 'Uniqlo (katakana)' }] },
  { keys: ['acne', 'acne studios'], name: 'Acne Studios', ja: [{ ja: 'アクネストゥディオズ', sv: 'Acne Studios (katakana)' }] },
  { keys: ['diesel'], name: 'Diesel', ja: [{ ja: 'ディーゼル', sv: 'Diesel (katakana)' }] },
  { keys: ['g-star', 'gstar'], name: 'G-Star', ja: [{ ja: 'ジースター', sv: 'G-Star (katakana)' }] },
  { keys: ['tommy', 'tommy hilfiger'], name: 'Tommy Hilfiger', ja: [{ ja: 'トミーヒルフィガー', sv: 'Tommy Hilfiger (katakana)' }] },
  { keys: ['champion'], name: 'Champion', ja: [{ ja: 'チャンピオン', sv: 'Champion (katakana)' }, { ja: 'リバースウィーブ', sv: 'Reverse Weave (klassisk tröjmodell)' }] },
  { keys: ['nike'], name: 'Nike', ja: [{ ja: 'ナイキ', sv: 'Nike (katakana)' }] },
  { keys: ['adidas'], name: 'Adidas', ja: [{ ja: 'アディダス', sv: 'Adidas (katakana)' }] },
  { keys: ['red wing', 'redwing'], name: 'Red Wing', ja: [{ ja: 'レッドウィング', sv: 'Red Wing (katakana)' }] },
  { keys: ['dr martens', 'dr. martens', 'martens'], name: 'Dr. Martens', ja: [{ ja: 'ドクターマーチン', sv: 'Dr. Martens (katakana)' }] },
];

interface Word {
  keys: string[];
  terms: Term[];
  kind: 'plagg' | 'detalj' | 'skick' | 'färg';
}

export const WORDS: Word[] = [
  { kind: 'plagg', keys: ['jeans', 'jeansen', 'denim'], terms: [{ ja: 'ジーンズ', sv: 'Jeans' }, { ja: 'デニム', sv: 'Denim' }, { ja: 'デニムパンツ', sv: 'Jeansbyxor (denimbyxor)' }, { ja: 'ジーパン', sv: 'Jeans (vardagligt ord)' }] },
  { kind: 'plagg', keys: ['jeansjacka', 'denimjacka', 'jeans jacka'], terms: [{ ja: 'デニムジャケット', sv: 'Jeansjacka' }, { ja: 'Gジャン', sv: 'Jeansjacka (vardagligt, "G-jacka")' }] },
  { kind: 'plagg', keys: ['jacka', 'jackor', 'jacket'], terms: [{ ja: 'ジャケット', sv: 'Jacka' }, { ja: 'ブルゾン', sv: 'Blouson, kort jacka' }] },
  { kind: 'plagg', keys: ['rock', 'kappa', 'coat'], terms: [{ ja: 'コート', sv: 'Rock/kappa' }] },
  { kind: 'plagg', keys: ['vinterjacka', 'dunjacka', 'puffer'], terms: [{ ja: 'ダウンジャケット', sv: 'Dunjacka' }] },
  { kind: 'plagg', keys: ['tröja', 'tröjor', 'sweatshirt', 'college'], terms: [{ ja: 'スウェット', sv: 'Sweatshirt/collegetröja' }, { ja: 'トレーナー', sv: 'Collegetröja (japanskt ord)' }] },
  { kind: 'plagg', keys: ['stickad', 'stickat', 'knit', 'kofta', 'cardigan'], terms: [{ ja: 'ニット', sv: 'Stickat' }, { ja: 'セーター', sv: 'Stickad tröja' }, { ja: 'カーディガン', sv: 'Kofta' }] },
  { kind: 'plagg', keys: ['hoodie', 'luvtröja', 'huvtröja'], terms: [{ ja: 'パーカー', sv: 'Hoodie (luvtröja)' }, { ja: 'フーディー', sv: 'Hoodie (engelskt lånord)' }] },
  { kind: 'plagg', keys: ['t-shirt', 'tshirt', 't-shirts', 'tisha'], terms: [{ ja: 'Tシャツ', sv: 'T-shirt' }, { ja: 'プリントTシャツ', sv: 'T-shirt med tryck' }] },
  { kind: 'plagg', keys: ['långärmad', 'longsleeve'], terms: [{ ja: 'ロンT', sv: 'Långärmad t-shirt' }] },
  { kind: 'plagg', keys: ['skjorta', 'skjortor', 'shirt'], terms: [{ ja: 'シャツ', sv: 'Skjorta' }, { ja: 'ネルシャツ', sv: 'Flanellskjorta' }, { ja: 'ワークシャツ', sv: 'Arbetsskjorta' }] },
  { kind: 'plagg', keys: ['byxor', 'chinos', 'byxa'], terms: [{ ja: 'パンツ', sv: 'Byxor' }, { ja: 'チノパン', sv: 'Chinos' }, { ja: 'ワークパンツ', sv: 'Arbetsbyxor' }] },
  { kind: 'plagg', keys: ['shorts'], terms: [{ ja: 'ショーツ', sv: 'Shorts' }, { ja: 'ハーフパンツ', sv: 'Knälånga shorts' }] },
  { kind: 'plagg', keys: ['skor', 'sko', 'sneakers'], terms: [{ ja: 'スニーカー', sv: 'Sneakers' }, { ja: '靴', sv: 'Skor' }] },
  { kind: 'plagg', keys: ['kängor', 'boots', 'stövlar'], terms: [{ ja: 'ブーツ', sv: 'Kängor/boots' }] },
  { kind: 'plagg', keys: ['väst', 'vest'], terms: [{ ja: 'ベスト', sv: 'Väst' }] },
  { kind: 'plagg', keys: ['overall', 'hängselbyxor'], terms: [{ ja: 'オーバーオール', sv: 'Hängselbyxor/overall' }, { ja: 'カバーオール', sv: 'Arbetsjacka (coverall)' }] },
  { kind: 'detalj', keys: ['selvedge', 'selvage', 'redline', 'red line'], terms: [{ ja: '赤耳', sv: 'Röd kant (selvedge/redline)' }, { ja: 'セルビッチ', sv: 'Selvedge' }, { ja: 'セルヴィッジ', sv: 'Selvedge, alternativ stavning' }] },
  { kind: 'detalj', keys: ['vintage', 'gammal', 'retro'], terms: [{ ja: 'ヴィンテージ', sv: 'Vintage' }, { ja: 'ビンテージ', sv: 'Vintage, alternativ stavning' }, { ja: '古着', sv: 'Second hand/vintagekläder' }] },
  { kind: 'detalj', keys: ['faded', 'fade', 'urtvättad', 'sliten'], terms: [{ ja: '色落ち', sv: 'Urblekt, fina fades' }, { ja: 'ヒゲ', sv: 'Whiskers (veck vid höften)' }, { ja: 'ハチノス', sv: 'Honeycombs (fades bakom knät)' }] },
  { kind: 'detalj', keys: ['raw', 'dry', 'otvättad', 'rigid'], terms: [{ ja: 'リジッド', sv: 'Rigid (otvättad denim)' }, { ja: '未洗い', sv: 'Otvättad' }, { ja: 'ノンウォッシュ', sv: 'Non-wash (otvättad)' }] },
  { kind: 'detalj', keys: ['one wash', 'onewash', 'tvättad en gång'], terms: [{ ja: 'ワンウォッシュ', sv: 'One wash (tvättad en gång)' }] },
  { kind: 'detalj', keys: ['rak', 'straight', 'raka'], terms: [{ ja: 'ストレート', sv: 'Rak passform' }] },
  { kind: 'detalj', keys: ['slim', 'smal', 'smala'], terms: [{ ja: 'スリム', sv: 'Slim' }, { ja: 'スキニー', sv: 'Skinny' }] },
  { kind: 'detalj', keys: ['bootcut', 'utsvängd'], terms: [{ ja: 'ブーツカット', sv: 'Bootcut' }, { ja: 'フレア', sv: 'Utsvängd (flare)' }] },
  { kind: 'detalj', keys: ['vid', 'vida', 'wide', 'baggy', 'loose'], terms: [{ ja: 'ワイド', sv: 'Vid' }, { ja: 'バギー', sv: 'Baggy' }, { ja: 'ルーズ', sv: 'Lös passform' }] },
  { kind: 'detalj', keys: ['tapered', 'avsmalnande'], terms: [{ ja: 'テーパード', sv: 'Avsmalnande ben (tapered)' }] },
  { kind: 'detalj', keys: ['trasig', 'trasiga', 'hål', 'distressed', 'damage'], terms: [{ ja: 'ダメージ', sv: 'Slitningar/hål (damage)' }, { ja: 'クラッシュ', sv: 'Kraftigt sliten (crash)' }] },
  { kind: 'detalj', keys: ['lagad', 'lagning', 'repair', 'reparerad'], terms: [{ ja: 'リペア', sv: 'Lagad (repair)' }, { ja: 'リメイク', sv: 'Omsydd (remake)' }] },
  { kind: 'detalj', keys: ['usa', 'made in usa', 'amerikansk'], terms: [{ ja: 'USA製', sv: 'Tillverkad i USA' }, { ja: 'アメリカ製', sv: 'Tillverkad i USA (annat ord)' }] },
  { kind: 'detalj', keys: ['japan', 'made in japan', 'japansk'], terms: [{ ja: '日本製', sv: 'Tillverkad i Japan' }] },
  { kind: 'detalj', keys: ['90-tal', '90s', 'nittiotal'], terms: [{ ja: '90年代', sv: '1990-talet' }, { ja: '90s', sv: '90-tal' }] },
  { kind: 'detalj', keys: ['80-tal', '80s', 'åttiotal'], terms: [{ ja: '80年代', sv: '1980-talet' }] },
  { kind: 'detalj', keys: ['70-tal', '70s'], terms: [{ ja: '70年代', sv: '1970-talet' }] },
  { kind: 'detalj', keys: ['ull', 'wool'], terms: [{ ja: 'ウール', sv: 'Ull' }] },
  { kind: 'detalj', keys: ['läder', 'leather', 'skinn'], terms: [{ ja: 'レザー', sv: 'Läder' }, { ja: '革', sv: 'Läder (kanji)' }] },
  { kind: 'detalj', keys: ['kort', 'cropped'], terms: [{ ja: 'クロップド', sv: 'Kortare modell (cropped)' }] },
  { kind: 'färg', keys: ['svart', 'svarta', 'black'], terms: [{ ja: 'ブラック', sv: 'Svart' }, { ja: '黒', sv: 'Svart (kanji)' }] },
  { kind: 'färg', keys: ['blå', 'blåa', 'indigo'], terms: [{ ja: 'インディゴ', sv: 'Indigo' }, { ja: 'ブルー', sv: 'Blå' }] },
  { kind: 'färg', keys: ['vit', 'vita', 'white', 'ecru'], terms: [{ ja: 'ホワイト', sv: 'Vit' }, { ja: '生成り', sv: 'Ecru (ofärgad)' }] },
  { kind: 'färg', keys: ['grå', 'gråa', 'grey', 'gray'], terms: [{ ja: 'グレー', sv: 'Grå' }] },
  { kind: 'färg', keys: ['grön', 'gröna', 'olive', 'oliv', 'military'], terms: [{ ja: 'オリーブ', sv: 'Olivgrön' }, { ja: 'ミリタリー', sv: 'Militärstil' }] },
  { kind: 'färg', keys: ['brun', 'bruna', 'brown'], terms: [{ ja: 'ブラウン', sv: 'Brun' }] },
  { kind: 'skick', keys: ['fint skick', 'bra skick', 'fin', 'snygg'], terms: [{ ja: '美品', sv: 'Fint skick' }, { ja: '極美品', sv: 'Mycket fint skick' }] },
  { kind: 'skick', keys: ['ny', 'oanvänd', 'nya', 'deadstock'], terms: [{ ja: '新品', sv: 'Ny' }, { ja: '未使用', sv: 'Oanvänd' }, { ja: 'タグ付き', sv: 'Med prislapp kvar' }, { ja: 'デッドストック', sv: 'Deadstock (aldrig såld)' }] },
  { kind: 'skick', keys: ['billig', 'billigt', 'defekt', 'skadad'], terms: [{ ja: '訳あり', sv: 'Med defekt (billigare)' }, { ja: 'ジャンク', sv: 'Trasig/för lagning (junk)' }] },
];

const SMART: Term[] = [
  { ja: '古着', sv: 'Second hand', tip: 'Lägg till för att få fler begagnade fynd' },
  { ja: '希少', sv: 'Sällsynt', tip: 'Säljare använder ordet om ovanliga plagg' },
  { ja: 'レア', sv: 'Rar/ovanlig' },
  { ja: '限定', sv: 'Begränsad upplaga' },
  { ja: '当時物', sv: 'Original från sin tid (inte nyutgåva)', tip: 'Bra för äkta vintage' },
  { ja: '復刻', sv: 'Nyutgåva (reproduktion)', tip: 'Undvik om du vill ha original' },
  { ja: 'まとめ売り', sv: 'Säljs i paket (flera plagg)', tip: 'Ofta lägre pris per plagg' },
  { ja: '大きいサイズ', sv: 'Stor storlek' },
];

function norm(s: string) {
  return s.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
}

/** Plocka ut storlekar: W30, 32/32, 30x32, S/M/L/XL, EU 42 */
function sizes(q: string): Term[] {
  const out: Term[] = [];
  const w = q.match(/\bw\s?(\d{2})(?:\s?[l/x]\s?(\d{2}))?\b/i) ?? q.match(/\b(\d{2})\s?[/x]\s?(\d{2})\b/);
  if (w) {
    out.push({ ja: `W${w[1]}`, sv: `Midjemått ${w[1]} tum` });
    if (w[2]) out.push({ ja: `W${w[1]} L${w[2]}`, sv: `Midja ${w[1]}, innerbenslängd ${w[2]}` });
    const cm = Math.round(+w[1] * 2.54);
    out.push({ ja: `ウエスト${cm}`, sv: `Midja ${cm} cm (japanska annonser anger ofta cm)` });
  }
  const s = q.match(/(?:^|\s)(xxs|xs|s|m|l|xl|xxl)(?=\s|$)/i);
  if (s) out.push({ ja: `サイズ${s[1].toUpperCase()}`, sv: `Storlek ${s[1].toUpperCase()}` });
  const shoe = q.match(/\b(?:eu\s?)?(3[6-9]|4[0-7])\b/);
  const JP: Record<number, string> = { 36: '23', 37: '23.5', 38: '24', 39: '24.5', 40: '25', 41: '26', 42: '26.5', 43: '27.5', 44: '28', 45: '29', 46: '29.5', 47: '30' };
  if (shoe && /sko|skor|sneaker|känga|boots/i.test(q)) out.push({ ja: `${JP[+shoe[1]]}cm`, sv: `Japansk skostorlek (cm) för EU ${shoe[1]}, ungefärlig` });
  return out;
}

export interface SearchGroup {
  title: string;
  terms: Term[];
}

/** Bygg söktermer i grupper från en svensk beskrivning, t.ex. "Levi's 501 vintage W32 svarta". */
export function buildSearch(input: string): { groups: SearchGroup[]; understood: string[] } {
  const q = norm(input);
  const understood: string[] = [];
  const brands = BRANDS.filter((b) => b.keys.some((k) => new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(q)));
  const tokens = q.split(/[^a-zåäö0-9'-]+/).filter(Boolean);
  // Svenska böjningar: "otvättade" matchar "otvättad", "svarta" matchar "svart"
  const words = WORDS.filter((w) =>
    w.keys.some((k) => new RegExp(`(^|[^a-zåäö])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zåäö]|$)`).test(q) || (k.length >= 4 && !k.includes(' ') && tokens.some((t) => t.startsWith(k) && t.length - k.length <= 3))),
  );
  const models = q.match(/\b(5\d{2}(?:xx)?|66|zxx)\b/gi) ?? [];
  brands.forEach((b) => understood.push(b.name));
  words.forEach((w) => understood.push(w.keys[0]));
  models.forEach((m) => understood.push(`modell ${m}`));
  const size = sizes(q);
  size.forEach((s) => understood.push(s.sv));

  const item = words.filter((w) => w.kind === 'plagg');
  const det = words.filter((w) => w.kind === 'detalj' || w.kind === 'färg');
  const cond = words.filter((w) => w.kind === 'skick');
  const b0 = brands[0];
  const brandJa = b0?.ja[0];
  const itemJa = item[0]?.terms[0] ?? (b0?.jeansWords ? WORDS[0].terms[0] : undefined);
  const join = (...xs: (string | undefined)[]) => xs.filter(Boolean).join(' ');
  const svJoin = (...xs: (string | undefined)[]) => xs.filter(Boolean).join(' + ');

  const groups: SearchGroup[] = [];
  // 1. Direkt översättning
  const direct: Term[] = [];
  if (brandJa || itemJa)
    direct.push({ ja: join(brandJa?.ja, ...models, itemJa?.ja), sv: svJoin(brandJa?.sv, ...models.map((m) => `modell ${m}`), itemJa?.sv), tip: 'Börja här' });
  for (const b of brands) for (const t of b.ja.slice(1)) direct.push({ ja: join(t.ja, ...models, itemJa?.ja), sv: svJoin(t.sv, ...models.map((m) => `modell ${m}`), itemJa?.sv) });
  for (const it of item) for (const t of it.terms.slice(1, 3)) direct.push({ ja: join(brandJa?.ja, t.ja), sv: svJoin(brandJa?.sv, t.sv) });
  if (direct.length) groups.push({ title: 'Direkt översättning', terms: dedupe(direct) });

  // 2. Detaljerade sökningar
  const detailed: Term[] = [];
  for (const d of det) for (const t of d.terms.slice(0, 2)) detailed.push({ ja: join(brandJa?.ja, itemJa?.ja, t.ja), sv: svJoin(brandJa?.sv, itemJa?.sv, t.sv) });
  if (b0?.jeansWords && (!item.length || item[0].keys.includes('jeans')))
    for (const t of b0.jeansWords.slice(0, 4)) detailed.push({ ja: join(brandJa?.ja, t.ja), sv: svJoin(brandJa?.sv, t.sv), tip: t.tip });
  if (detailed.length) groups.push({ title: 'Mer detaljerade sökningar', terms: dedupe(detailed) });

  // 3. Alternativa stavningar
  const alt: Term[] = [];
  for (const b of brands) for (const t of b.ja) alt.push(t);
  for (const it of item) for (const t of it.terms) alt.push(t);
  if (alt.length) groups.push({ title: 'Alternativa stavningar och namn', terms: dedupe(alt) });

  // 4. Storlek och skick
  const sc: Term[] = [...size.map((s) => ({ ja: join(brandJa?.ja, itemJa?.ja, s.ja), sv: svJoin(brandJa?.sv, itemJa?.sv, s.sv) }))];
  for (const c of cond) for (const t of c.terms) sc.push({ ja: join(brandJa?.ja, itemJa?.ja, t.ja), sv: svJoin(brandJa?.sv, itemJa?.sv, t.sv) });
  if (!cond.length && (brandJa || itemJa)) sc.push({ ja: join(brandJa?.ja, itemJa?.ja, '美品'), sv: svJoin(brandJa?.sv, itemJa?.sv, 'fint skick') });
  if (sc.length) groups.push({ title: 'Storlek och skick', terms: dedupe(sc) });

  // 5. Smarta tillägg
  if (brandJa || itemJa) {
    const smart = SMART.slice(0, 6).map((s) => ({ ja: join(brandJa?.ja, itemJa?.ja, s.ja), sv: svJoin(brandJa?.sv, itemJa?.sv, s.sv), tip: s.tip }));
    groups.push({ title: 'Smarta tillägg som hittar unika plagg', terms: dedupe(smart) });
  }
  return { groups, understood };
}

function dedupe(ts: Term[]): Term[] {
  const seen = new Set<string>();
  return ts.filter((t) => {
    const k = t.ja.trim();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
