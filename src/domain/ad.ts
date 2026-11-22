import { inferBrand } from './doorzo';
import type { Category, Item, Settings } from './types';

/** Vilka mått som hör till varje kategori, i den ordning de skrivs i annonsen. */
export const MEASURES: Record<Category, string[]> = {
  Jeans: ['Midja', 'Ytterben', 'Innerben', 'Benöppning'],
  Byxor: ['Midja', 'Ytterben', 'Innerben', 'Benöppning'],
  Jackor: ['Bröstbredd', 'Längd', 'Axelbredd', 'Ärmlängd'],
  Tröjor: ['Bröstbredd', 'Längd', 'Axelbredd', 'Ärmlängd'],
  'T-shirts': ['Bröstbredd', 'Längd', 'Axelbredd'],
  Skjortor: ['Bröstbredd', 'Längd', 'Axelbredd', 'Ärmlängd'],
  Skor: ['Innersula'],
  Övrigt: ['Bredd', 'Längd'],
};

// Hur plagget benämns: "dessa jeans ... Jeansen har", "denna jacka ... Jackan har"
const WORDS: Record<Category, { these: string; the: string }> = {
  Jeans: { these: 'dessa', the: 'Jeansen' },
  Byxor: { these: 'dessa', the: 'Byxorna' },
  Jackor: { these: 'denna', the: 'Jackan' },
  Tröjor: { these: 'denna', the: 'Tröjan' },
  'T-shirts': { these: 'denna', the: 'T-shirten' },
  Skjortor: { these: 'denna', the: 'Skjortan' },
  Skor: { these: 'dessa', the: 'Skorna' },
  Övrigt: { these: 'denna', the: 'Plagget' },
};

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

/**
 * Annonstext enligt 881:s mall, t.ex.
 * "Säljer nu dessa Nudie Jeans i modellen Slim Jim. Jeansen har en bootcut passform och är i storlek w32
 *  men utgå alltid från angivna mått! Midja: 41 Ytterben: 103 Innerben: 79 Benöppning: 20 Modellen är 178 och väger 65!"
 * Delar som saknas hoppas över. Mått står alltid med när de finns.
 */
export function adText(item: Item, s: Pick<Settings, 'adModelHeight' | 'adModelWeight'>): string {
  const w = WORDS[item.category];
  const brand = item.brand.trim() || inferBrand(item.name) || '';
  const model = item.model.trim();
  const what = brand || item.name.trim();
  let first = `Säljer nu ${w.these} ${what}`;
  if (model) first += ` i modellen ${model}`;
  else if (brand && item.name.trim() && !item.name.toLowerCase().includes(brand.toLowerCase())) first += ` (${item.name.trim()})`;
  first += '.';

  const parts: string[] = [];
  const fit = item.fit?.trim();
  const size = item.size.trim();
  if (fit && size) parts.push(`${w.the} har en ${fit} passform och är i storlek ${size.toLowerCase()} men utgå alltid från angivna mått!`);
  else if (fit) parts.push(`${w.the} har en ${fit} passform, utgå alltid från angivna mått!`);
  else if (size) parts.push(`${w.the} är i storlek ${size.toLowerCase()} men utgå alltid från angivna mått!`);

  const m = item.measurements ?? {};
  const keys = [...MEASURES[item.category], ...Object.keys(m).filter((k) => !MEASURES[item.category].includes(k))];
  const meas = keys.filter((k) => m[k] > 0).map((k) => `${k}: ${fmt(m[k])}`);

  const model2 = s.adModelHeight > 0 ? `Modellen är ${s.adModelHeight}${s.adModelWeight > 0 ? ` och väger ${s.adModelWeight}` : ''}!` : '';
  return [first, ...parts, ...meas, model2].filter(Boolean).join(' ');
}

/** Hur många av kategorins mått som är ifyllda. */
export function measuresFilled(item: Item): { filled: number; total: number } {
  const keys = MEASURES[item.category];
  return { filled: keys.filter((k) => (item.measurements?.[k] ?? 0) > 0).length, total: keys.length };
}
