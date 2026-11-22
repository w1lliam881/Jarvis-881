import { maxPriceFor } from './calc';
import { buildSearch } from './doorzo';
import type { History } from './metrics';
import type { SearchSaved, Settings } from './types';

export interface WatchView {
  watch: SearchSaved;
  /** Maxpris i ören (före frakt och tull) och varifrån det kommer */
  maxPrice: number | null;
  maxSource: 'eget' | 'krav' | null;
  maxYen: number | null;
  terms: { ja: string; sv: string }[];
  links: { label: string; url: string }[];
}

/** Färdiga sökningar för en bevakning. Länkarna öppnar sökningen, inget hämtas automatiskt. */
export function watchView(w: SearchSaved, H: History, s: Settings): WatchView {
  const { groups } = buildSearch(w.query);
  const terms = groups.flatMap((g) => g.terms).slice(0, 6);
  const auto = w.category ? maxPriceFor(w.category, H, s)?.maxPrice ?? null : null;
  const maxPrice = w.maxPrice ?? auto;
  const maxYen = maxPrice ? Math.floor(((maxPrice / 100) * s.yenPerSek) / 100) * 100 : null;
  const kw = terms[0]?.ja ?? w.query;
  const enc = encodeURIComponent(kw);
  const links = [
    { label: 'Mercari', url: `https://jp.mercari.com/search?keyword=${enc}&status=on_sale${maxYen ? `&price_max=${maxYen}` : ''}` },
    { label: 'Rakuma', url: `https://fril.jp/s?query=${enc}${maxYen ? `&max=${maxYen}` : ''}` },
  ];
  return { watch: w, maxPrice, maxSource: w.maxPrice ? 'eget' : auto ? 'krav' : null, maxYen, terms, links };
}
