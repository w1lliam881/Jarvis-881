import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useData } from '../../data/store';
import { linkSaleToItem } from '../../data/actions';
import { monthName, todayISO } from '../../domain/dates';
import { unlinkedSales, saleAmount } from '../../domain/ledger';
import { allLanded, isSold } from '../../domain/metrics';
import { kr } from '../../domain/money';
import { PLATFORMS } from '../../domain/types';
import { Card, Chips, Empty, Money, Page, RoiPill, Section, Sheet, TopBand, cx } from '../components/ui';
import { go } from '../router';
import { openQuick } from '../App';

export function Salj() {
  const ds = useData();
  const [q, setQ] = useState('');
  const [p, setP] = useState<string>('Alla');
  const [link, setLink] = useState<string | null>(null);
  const L = useMemo(() => allLanded(ds).filter((l) => isSold(l.item)), [ds]);
  const list = L.filter((l) => (p === 'Alla' || l.item.platform === p) && (!q || `${l.item.name} ${l.item.productId} ${l.item.brand} ${l.drop.name} ${l.item.comment}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) =>
    (b.item.saleDate ?? '') > (a.item.saleDate ?? '') ? 1 : -1,
  );
  const months = new Map<string, typeof list>();
  for (const l of list) {
    const m = l.item.saleDate?.slice(0, 7) ?? 'okänt';
    months.set(m, [...(months.get(m) ?? []), l]);
  }
  const unl = unlinkedSales(ds);
  const thisMonth = L.filter((l) => (l.item.saleDate ?? '').startsWith(todayISO().slice(0, 7)));
  return (
    <>
      <TopBand title="Försäljning" sub={`${L.length} sålda totalt`} right={<button className="btn btn-sun mt-1 h-10 min-h-0 px-3 text-[14px]" onClick={() => openQuick('sale')}>Sålt något</button>}>
        <div className="grid grid-cols-3 gap-3 text-[12px] text-on-forest-muted">
          <div>
            Denna månad
            <div className="num text-[17px] text-on-forest">{kr(thisMonth.reduce((s, l) => s + l.item.salePrice, 0))}</div>
          </div>
          <div>
            Antal
            <div className="num text-[17px] text-on-forest">{thisMonth.length} st</div>
          </div>
          <div>
            Snittpris
            <div className="num text-[17px] text-on-forest">{thisMonth.length ? kr(thisMonth.reduce((s, l) => s + l.item.salePrice, 0) / thisMonth.length) : '–'}</div>
          </div>
        </div>
      </TopBand>
      <Page>
        {unl.length > 0 && (
          <Section title={`Bokförda försäljningar utan plagg · ${unl.length}`}>
            <Card pad={false}>
              {unl.map((v) => (
                <div key={v.id} className="flex min-h-[56px] items-center gap-3 border-b border-line-2 px-4 py-2 last:border-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px]">{v.text}</span>
                    <span className="block text-[12px] text-muted">
                      V{v.nr} · {v.date}
                    </span>
                  </span>
                  <Money v={saleAmount(v)} className="text-[14px]" />
                  <button type="button" className="btn btn-soft shrink-0 px-4 text-[14px]" onClick={() => setLink(v.id)}>
                    Koppla
                  </button>
                </div>
              ))}
            </Card>
          </Section>
        )}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-4">
        <div className="relative lg:w-[360px] lg:shrink-0">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input className="field pl-9" placeholder="Sök sålda plagg…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Sök sålda plagg" />
        </div>
        <Chips value={p} onChange={setP} options={['Alla', ...PLATFORMS].map((x) => ({ value: x, label: x }))} />
        </div>
        {[...months].map(([m, ls]) => (
          <Section
            key={m}
            title={<span className="first-letter:uppercase">{m === 'okänt' ? 'Utan datum' : monthName(m)}</span>}
            action={
              <span className="num text-muted">
                {ls.length} st · {kr(ls.reduce((s, l) => s + l.item.salePrice, 0))}
              </span>
            }
          >
            <Card pad={false} className="hidden overflow-hidden lg:block">
              <table className="w-full whitespace-nowrap text-[14px]">
                <thead>
                  <tr className="bg-surface-2 text-left text-[12px] text-muted">
                    <th className="w-[72px] px-4 py-2 font-medium">Datum</th>
                    <th className="px-2 py-2 font-medium">Plagg</th>
                    <th className="px-2 py-2 font-medium">Produkt-ID</th>
                    <th className="hidden xl:table-cell px-2 py-2 font-medium">Plattform</th>
                    <th className="hidden px-2 py-2 font-medium xl:table-cell">Drop</th>
                    <th className="hidden xl:table-cell px-2 py-2 text-right font-medium">Hemkostnad</th>
                    <th className="px-2 py-2 text-right font-medium">Såld för</th>
                    <th className="px-2 py-2 text-right font-medium">Vinst</th>
                    <th className="w-[84px] px-4 py-2 text-right font-medium">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {ls.map((l) => (
                    <tr key={l.item.id} className="cursor-pointer border-t border-line-2 hover:bg-surface-2" onClick={() => go(`#/lager/plagg/${l.item.id}`)}>
                      <td className="num px-4 py-2.5 text-[12px] text-muted">{l.item.saleDate ? `${+l.item.saleDate.slice(8)}/${+l.item.saleDate.slice(5, 7)}` : '–'}</td>
                      <td className="max-w-[260px] px-2 py-2.5">
                        <a href={`#/lager/plagg/${l.item.id}`} className="block truncate font-medium" onClick={(e) => e.stopPropagation()}>
                          {l.item.name}
                        </a>
                        {l.item.brand && <span className="block truncate text-[12px] text-muted">{l.item.brand}</span>}
                      </td>
                      <td className="num px-2 py-2.5 text-[12px] text-muted">{l.item.productId || '–'}</td>
                      <td className="hidden xl:table-cell px-2 py-2.5 text-muted">{l.item.platform ?? '–'}</td>
                      <td className="hidden max-w-[160px] truncate px-2 py-2.5 text-muted xl:table-cell">{l.drop.name}</td>
                      <td className="hidden xl:table-cell px-2 py-2.5 text-right">
                        <Money v={l.landed} className="text-muted" />
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <Money v={l.item.salePrice} />
                      </td>
                      <td className={cx('px-2 py-2.5 text-right', (l.profit ?? 0) < 0 ? 'text-neg' : 'text-pos')}>
                        <Money v={l.profit ?? 0} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <RoiPill roi={l.landed ? ((l.profit ?? 0) / l.landed) * 100 : null} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card pad={false} className="lg:hidden">
              {ls.map((l) => (
                <a key={l.item.id} href={`#/lager/plagg/${l.item.id}`} className="flex min-h-[52px] items-center gap-3 border-b border-line-2 px-4 py-2 last:border-0 active:bg-surface-2">
                  <span className="num w-11 shrink-0 text-[12px] text-muted">{l.item.saleDate ? `${+l.item.saleDate.slice(8)}/${+l.item.saleDate.slice(5, 7)}` : '–'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">{l.item.name}</span>
                    <span className="block truncate text-[12px] text-muted">{[l.item.productId, l.item.platform, l.drop.name].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <Money v={l.item.salePrice} className="text-[14px]" />
                    <RoiPill roi={l.landed ? ((l.profit ?? 0) / l.landed) * 100 : null} />
                  </span>
                </a>
              ))}
            </Card>
          </Section>
        ))}
        {!list.length && <Empty title="Ingen försäljning här" text="När något säljs: tryck på Ny och välj Försäljning." />}
      </Page>
      {link && <LinkSheet voucherId={link} onClose={() => setLink(null)} />}
    </>
  );
}

function LinkSheet({ voucherId, onClose }: { voucherId: string; onClose: () => void }) {
  const ds = useData();
  const v = ds.vouchers.find((x) => x.id === voucherId)!;
  const [q, setQ] = useState('');
  const amt = saleAmount(v);
  const linked = new Set(ds.vouchers.filter((x) => !x.deletedAt && x.source !== 'auto' && x.itemId && x.id !== v.id).map((x) => x.itemId));
  const needle = q.toLowerCase();
  const list = allLanded(ds)
    .filter((l) => !linked.has(l.item.id) && `${l.item.name} ${l.item.productId} ${l.item.brand} ${l.drop.name}`.toLowerCase().includes(needle))
    .sort((a, b) => Number(isSold(a.item)) - Number(isSold(b.item)))
    .slice(0, 60);
  return (
    <Sheet open onClose={onClose} title="Koppla till plagg">
      <p className="mt-0 text-[14px] text-muted">
        {v.text} · {kr(amt)} · {v.date}. Plagget markeras som sålt för samma belopp och datum, och verifikatet kopplas till det. Är plagget redan markerat som sålt ersätter det här verifikatet den automatiska bokningen, så att försäljningen inte räknas två gånger.
      </p>
      <input className="field mb-2" placeholder="Sök plagg, produkt-ID eller drop…" value={q} onChange={(e) => setQ(e.target.value)} />
      <Card pad={false}>
        {list.map((l) => {
          const sold = isSold(l.item);
          const newDate = sold && l.item.saleDate !== v.date;
          const newAmount = sold && l.item.salePrice !== amt;
          return (
            <button key={l.item.id} type="button" onClick={() => void linkSaleToItem(v.id, l.item.id, amt).then((ok) => ok && onClose())} className="flex min-h-[52px] w-full items-center justify-between gap-3 border-b border-line-2 px-4 py-2 text-left last:border-0">
              <span className="min-w-0">
                <span className="block truncate">{l.item.name}</span>
                <span className="block text-[12px] text-muted">
                  {l.drop.name}
                  {l.item.productId ? ` · ${l.item.productId}` : ''}
                  {sold && !newDate && !newAmount ? ` · redan såld ${l.item.saleDate ?? ''} för ${kr(l.item.salePrice)}` : ''}
                </span>
                {(newDate || newAmount) && (
                  <span className="block text-[12px] font-medium text-hi">
                    Redan såld. Ändras:
                    {newDate ? ` säljdatum ${l.item.saleDate ?? 'saknas'} → ${v.date}` : ''}
                    {newDate && newAmount ? ',' : ''}
                    {newAmount ? ` belopp ${kr(l.item.salePrice)} → ${kr(amt)}` : ''}
                  </span>
                )}
              </span>
              <Money v={l.landed} className="text-[13px] text-muted" />
            </button>
          );
        })}
        {!list.length && <p className="m-0 p-4 text-muted">Inga plagg hittades.</p>}
      </Card>
    </Sheet>
  );
}
