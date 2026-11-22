import { healthScore, runChecks } from '../domain/checks';
import { daysBetween } from '../domain/dates';
import { inferBrand } from '../domain/doorzo';
import { allLanded, dropStats, isSold, live, overview } from '../domain/metrics';
import { quarterOf, quarterReport, type Quarter } from '../domain/quarter';
import type { Dataset, ISODate } from '../domain/types';

const kr = (ore: number) => Math.round(ore / 100);

/** Läsverktyg som Jarvis-chatten får använda. Körs i appen mot den riktiga datan. Belopp i hela kronor. */
export function runReadTool(name: string, input: Record<string, unknown>, ds: Dataset, today: ISODate): unknown {
  const L = allLanded(ds);
  switch (name) {
    case 'overview': {
      const o = overview(ds, today);
      return {
        månad: o.month,
        sålda_antal: o.soldCount,
        sålt_kr: kr(o.soldRevenue),
        vinst_på_sålda_kr: kr(o.soldProfit),
        osålda_antal: o.unsoldCount,
        lagervärde_kr: kr(o.stockValue),
        äldre_än_60_dagar: o.old60Count,
        resultat_bokföring_kr: kr(o.pl.result),
        kontrollpoäng: healthScore(runChecks(ds, today)),
      };
    }
    case 'search_items': {
      const q = String(input.query ?? '').toLowerCase();
      const st = String(input.status ?? 'alla');
      return L.filter((l) => (st === 'osålda' ? !isSold(l.item) : st === 'sålda' ? isSold(l.item) : true))
        .filter((l) => !q || `${l.item.name} ${l.item.brand} ${l.item.size} ${l.item.productId} ${l.item.category} ${l.drop.name}`.toLowerCase().includes(q))
        .slice(0, 25)
        .map((l) => ({
          id: l.item.id,
          produkt_id: l.item.productId || null,
          namn: l.item.name,
          märke: l.item.brand || inferBrand(l.item.name) || null,
          kategori: l.item.category,
          storlek: l.item.size || null,
          hemkostnad_kr: kr(l.landed),
          såld_för_kr: isSold(l.item) ? kr(l.item.salePrice) : null,
          säljdatum: l.item.saleDate,
          dagar_i_lager: isSold(l.item) ? null : daysBetween(l.drop.date, today),
          drop: l.drop.name,
        }));
    }
    case 'sales_summary': {
      const p = String(input.period ?? '');
      const by = String(input.group_by ?? 'märke');
      const m = new Map<string, { antal: number; omsättning: number; vinst: number }>();
      for (const l of L) {
        if (!isSold(l.item) || !(l.item.saleDate ?? '').startsWith(p)) continue;
        const k = by === 'kategori' ? l.item.category : by === 'månad' ? (l.item.saleDate ?? '').slice(0, 7) : l.item.brand || inferBrand(l.item.name) || 'Okänt märke';
        const g = m.get(k) ?? { antal: 0, omsättning: 0, vinst: 0 };
        g.antal++;
        g.omsättning += l.item.salePrice;
        g.vinst += l.profit ?? 0;
        m.set(k, g);
      }
      return [...m].map(([k, g]) => ({ [by]: k, antal: g.antal, omsättning_kr: kr(g.omsättning), vinst_kr: kr(g.vinst), marginal_procent: g.omsättning ? Math.round((g.vinst / g.omsättning) * 100) : 0 })).sort((a, b) => b.omsättning_kr - a.omsättning_kr);
    }
    case 'stale_items': {
      const min = Number(input.min_days ?? 60);
      return L.filter((l) => !isSold(l.item) && daysBetween(l.drop.date, today) >= min)
        .sort((a, b) => (a.drop.date < b.drop.date ? -1 : 1))
        .slice(0, 30)
        .map((l) => ({ id: l.item.id, produkt_id: l.item.productId || null, namn: l.item.name, märke: l.item.brand || null, storlek: l.item.size || null, dagar: daysBetween(l.drop.date, today), hemkostnad_kr: kr(l.landed), senast_publicerad: l.item.listedAt }));
    }
    case 'drops':
      return live(ds.drops)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((d) => {
          const s = dropStats(ds, d);
          return { id: d.id, namn: d.name, datum: d.date, plagg: s.count, sålda: s.sold, kostnad_kr: kr(s.cost), intäkt_kr: kr(s.revenue), resultat_kr: kr(s.result), roi_procent: Math.round(s.roi) };
        });
    case 'quarter_report': {
      const m = String(input.quarter ?? '').match(/(\d{4})-?Q([1-4])/i);
      const q: Quarter = m ? { year: +m[1], q: +m[2] as Quarter['q'] } : quarterOf(today);
      const r = quarterReport(ds, q);
      return {
        kvartal: `${q.year}-Q${q.q}`,
        sålda: r.soldCount,
        sålt_kr: kr(r.soldRevenue),
        vinst_kr: kr(r.soldProfit),
        marginal_procent: Math.round(r.margin),
        köp_mer: r.buyMore,
        köp_mindre: r.buyLess,
        noteringar: r.notes,
        märken: r.brands.slice(0, 8).map((g) => ({ märke: g.key, sålda: g.sold, vinst_kr: kr(g.profit), roi_procent: Math.round(g.roi) })),
      };
    }
    default:
      return { fel: `Okänt verktyg ${name}` };
  }
}

export const ACTION_TOOLS = new Set(['propose_sale', 'propose_cost', 'propose_task']);
