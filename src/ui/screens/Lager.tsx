import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, Circle, Copy, ExternalLink, Plus, AlertTriangle, RotateCcw, Search } from 'lucide-react';
import { adText, measuresFilled, MEASURES } from '../../domain/ad';
import { useData } from '../../data/store';
import { addItems, deleteDrop, deleteItem, returnItem, setOk, undoSale, updateDrop, updateItem } from '../../data/actions';
import { daysBetween, monthName, todayISO } from '../../domain/dates';
import { allLanded, dropStats, isSold, landedForDrop, itemsOfDrop, live, type LandedItem } from '../../domain/metrics';
import { kr } from '../../domain/money';
import { parseLines } from '../../domain/parse';
import { CATEGORIES, PLATFORMS, type CheckStatus, type Dataset, type Drop, type DropStatus, type Item } from '../../domain/types';
import { go } from '../router';
import type { Route } from '../router';
import { Bar, Card, Chips, ConfirmButton, Empty, Field, Money, MoneyInput, Page, Pill, RoiPill, Section, Select, Stat, TextInput, TopBand, cx } from '../components/ui';
import { SaleSheet, DropSheet, CostSheet, openDoorzo } from '../Quick';
import { findLinks } from '../../domain/doorzolink';
import { Attachments } from './Attachments';
import { DropPlanCard } from './DropPlan';
import { OwnerChip } from '../components/OwnerChip';
import { toast } from '../Boot';

export function Lager({ route }: { route: Route }) {
  const [, sub, id] = route.path;
  if (sub === 'drop' && id) return <DropView id={id} />;
  if (sub === 'plagg' && id) return <ItemView id={id} />;
  if (sub === 'drops') return <DropsList />;
  return <StockList initial={route.query.get('f') ?? 'unsold'} />;
}

// ---------- Lagerlista ----------

type Filter = 'unsold' | 'sold' | 'all' | 'old' | 'unchecked' | 'wrong';

function StockList({ initial }: { initial: string }) {
  const ds = useData();
  const today = todayISO();
  const [f, setF] = useState<Filter>((['unsold', 'sold', 'all', 'old', 'unchecked', 'wrong'].includes(initial) ? initial : 'unsold') as Filter);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('Alla');
  const [newDrop, setNewDrop] = useState(false);
  const L = useMemo(() => allLanded(ds), [ds]);
  const match = (l: LandedItem) => {
    const s = isSold(l.item);
    if (f === 'unsold' && s) return false;
    if (f === 'sold' && !s) return false;
    if (f === 'old' && (s || daysBetween(l.drop.date, today) <= 60)) return false;
    if (f === 'unchecked' && l.item.ok !== 0) return false;
    if (f === 'wrong' && l.item.ok !== 2) return false;
    if (cat !== 'Alla' && l.item.category !== cat) return false;
    if (q && !`${l.item.name} ${l.item.productId} ${l.item.brand} ${l.item.size} ${l.item.comment} ${l.drop.name} ${l.item.location}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  };
  const list = L.filter(match);
  const groups = new Map<string, LandedItem[]>();
  for (const l of list) groups.set(l.drop.id, [...(groups.get(l.drop.id) ?? []), l]);
  const sortedGroups = [...groups.values()].sort((a, b) => (a[0].drop.date < b[0].drop.date ? 1 : -1));
  const unsold = L.filter((l) => !isSold(l.item));
  const counts = {
    unsold: unsold.length,
    sold: L.length - unsold.length,
    all: L.length,
    old: unsold.filter((l) => daysBetween(l.drop.date, today) > 60).length,
    unchecked: L.filter((l) => l.item.ok === 0).length,
    wrong: L.filter((l) => l.item.ok === 2).length,
  };
  const cats = ['Alla', ...CATEGORIES.filter((c) => L.some((l) => l.item.category === c))];
  return (
    <>
      <TopBand title="Lager" sub={`${counts.unsold} osålda · ${kr(unsold.reduce((s, l) => s + l.landed, 0))} i lager`} right={<a href="#/lager/drops" className="mt-1 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold">Drops</a>}>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input className="field pl-9" placeholder="Sök plagg, märke, storlek, plats…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Sök i lagret" />
        </div>
      </TopBand>
      <Page>
        <OwnerChip agent="economizer" className="self-start" />
        <Chips
          value={f}
          onChange={setF}
          options={[
            { value: 'unsold', label: 'Osålda', count: counts.unsold },
            { value: 'old', label: 'Över 60 dagar', count: counts.old },
            { value: 'sold', label: 'Sålda', count: counts.sold },
            { value: 'all', label: 'Alla', count: counts.all },
            { value: 'unchecked', label: 'Ej kontrollerade', count: counts.unchecked },
            { value: 'wrong', label: 'Fel', count: counts.wrong },
          ]}
        />
        {cats.length > 2 && <Chips value={cat} onChange={setCat} options={cats.map((c) => ({ value: c, label: c }))} />}
        <div className="desk-grid2">
        {sortedGroups.map((g) => (
          <Section key={g[0].drop.id} title={g[0].drop.name} action={<a href={`#/lager/drop/${g[0].drop.id}`}>{g.length} plagg ›</a>}>
            <Card pad={false}>
              {g.map((l) => (
                <ItemRow key={l.item.id} l={l} today={today} />
              ))}
            </Card>
          </Section>
        ))}
        </div>
        {!list.length && <Empty title="Inga plagg här" text={q ? 'Inget matchar sökningen.' : 'Lägg in en drop så dyker plaggen upp här.'} action={<button className="btn btn-primary" onClick={() => setNewDrop(true)}>Ny drop</button>} />}
      </Page>
      {newDrop && <DropSheet onClose={() => setNewDrop(false)} />}
    </>
  );
}

export function OkChip({ ok, onChange, label }: { ok: CheckStatus; onChange: (v: CheckStatus) => void; label: string }) {
  const next = ((ok + 1) % 3) as CheckStatus;
  const I = ok === 1 ? CheckCircle2 : ok === 2 ? AlertTriangle : Circle;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(next);
      }}
      aria-label={`${label}: ${ok === 1 ? 'stämmer' : ok === 2 ? 'fel' : 'ej kontrollerad'}. Tryck för att ändra.`}
      className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', ok === 1 ? 'text-pos' : ok === 2 ? 'text-hi' : 'text-muted')}
    >
      <I size={18} aria-hidden />
    </button>
  );
}

function ItemRow({ l, today }: { l: LandedItem; today: string }) {
  const s = isSold(l.item);
  const age = daysBetween(l.drop.date, today);
  return (
    <a href={`#/lager/plagg/${l.item.id}`} className="flex min-h-[56px] items-center gap-2 border-b border-line-2 py-2 pl-4 pr-2 last:border-0 active:bg-surface-2">
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[15px]">{l.item.name}</span>
          {l.item.productId && <ProductId id={l.item.productId} />}
        </span>
        <span className="block truncate text-[12px] text-muted">
          {[l.item.brand, l.item.size, l.item.category, !s && age > 60 ? `${age} dagar` : null, l.item.location].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        {s ? (
          <>
            <Money v={l.item.salePrice} className="text-[14px]" />
            <RoiPill roi={l.landed ? ((l.profit ?? 0) / l.landed) * 100 : null} />
          </>
        ) : (
          <>
            <Money v={l.landed} className="text-[14px] text-muted" />
            {age > 60 && <span className="text-[11px] text-me">{age} d</span>}
          </>
        )}
      </span>
      <OkChip ok={l.item.ok} label={l.item.name} onChange={(v) => void setOk('items', l.item.id, v)} />
    </a>
  );
}

// ---------- Drops: år → månad → drop ----------

function DropsList() {
  const ds = useData();
  const drops = live(ds.drops).sort((a, b) => (a.date < b.date ? 1 : -1));
  const years = [...new Set(drops.map((d) => d.date.slice(0, 4)))];
  const [year, setYear] = useState(years[0] ?? todayISO().slice(0, 4));
  const [newDrop, setNewDrop] = useState(false);
  const inYear = drops.filter((d) => d.date.startsWith(year));
  const stats = inYear.map((d) => dropStats(ds, d));
  const tot = stats.reduce((o, s) => ({ n: o.n + s.count, c: o.c + s.cost, r: o.r + s.revenue }), { n: 0, c: 0, r: 0 });
  const months = [...new Set(inYear.map((d) => d.date.slice(0, 7)))];
  return (
    <>
      <TopBand title="Drops" back="#/lager" sub={`${drops.length} drops totalt`} right={<button className="btn btn-sun mt-1 h-10 min-h-0 px-3 text-[14px]" onClick={() => setNewDrop(true)}><Plus size={16} aria-hidden /> Drop</button>} />
      <Page>
        {years.length > 1 && <Chips value={year} onChange={setYear} options={years.map((y) => ({ value: y, label: y }))} />}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label={`Plagg ${year}`} value={tot.n} />
          <Stat label="Total kostnad" value={kr(tot.c)} />
          <Stat label="Försäljning" value={kr(tot.r)} />
          <Stat label="ROI" value={<RoiPill roi={tot.c ? ((tot.r - tot.c) / tot.c) * 100 : null} />} />
        </div>
        <div className="desk-grid2">
        {months.map((m) => (
          <Section key={m} title={<span className="first-letter:uppercase">{monthName(m, false)}</span>}>
            <Card pad={false}>
              {inYear
                .filter((d) => d.date.startsWith(m))
                .map((d) => {
                  const s = dropStats(ds, d);
                  return (
                    <a key={d.id} href={`#/lager/drop/${d.id}`} className="flex min-h-[64px] items-center gap-3 border-b border-line-2 px-4 py-3 last:border-0 active:bg-surface-2">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold">{d.name}</span>
                          {d.status !== 'hemma' && <Pill tone="me">{d.status}</Pill>}
                        </span>
                        <span className="block text-[12px] text-muted">
                          {s.sold} av {s.count} sålda · kostnad {kr(s.cost)}
                        </span>
                        <Bar value={s.sold} max={s.count || 1} className="mt-1.5" />
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <RoiPill roi={s.cost ? s.roi : null} />
                        <Money v={s.result} className="text-[12px] text-muted" />
                      </span>
                      <ChevronRight size={18} className="text-muted" aria-hidden />
                    </a>
                  );
                })}
            </Card>
          </Section>
        ))}
        </div>
        {!drops.length && <Empty title="Inga drops än" text="Skapa en drop genom att klistra in plaggen." action={<button className="btn btn-primary" onClick={() => setNewDrop(true)}>Ny drop</button>} />}
      </Page>
      {newDrop && <DropSheet onClose={() => setNewDrop(false)} />}
    </>
  );
}

// ---------- En drop ----------

function DropView({ id }: { id: string }) {
  const ds = useData();
  const drop = ds.drops.find((d) => d.id === id && !d.deletedAt);
  const [filter, setFilter] = useState<'all' | 'unsold' | 'sold'>('all');
  const [paste, setPaste] = useState('');
  const [cost, setCost] = useState<null | 'shipping' | 'customs'>(null);
  if (!drop) return <Missing what="Dropen" back="#/lager/drops" />;
  const items = itemsOfDrop(ds, drop.id);
  const L = landedForDrop(drop, items, ds.settings.packaging);
  const s = dropStats(ds, drop);
  const rows = parseLines(paste);
  const shown = L.filter((l) => (filter === 'sold' ? isSold(l.item) : filter === 'unsold' ? !isSold(l.item) : true));
  const up = (p: Partial<Drop>) => void updateDrop(drop.id, p);
  return (
    <>
      <TopBand title={drop.name} back="#/lager/drops" sub={`${drop.date} · ${drop.status}`} right={<OkChip ok={drop.ok} label={drop.name} onChange={(v) => void setOk('drops', drop.id, v)} />}>
        <div className="grid grid-cols-3 gap-3 text-[12px] text-on-forest-muted">
          <div>
            Kostnad
            <div className="num text-[17px] text-on-forest">{kr(s.cost)}</div>
          </div>
          <div>
            Intäkt
            <div className="num text-[17px] text-on-forest">{kr(s.revenue)}</div>
          </div>
          <div>
            ROI
            <div className={cx('num text-[17px]', s.roi >= 0 ? 'text-mint' : 'text-[#F4A08F]')}>{s.cost ? `${Math.round(s.roi)} %` : '–'}</div>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <i className="block h-full rounded-full bg-mint" style={{ width: `${s.count ? (s.sold / s.count) * 100 : 0}%` }} />
        </div>
        <div className="mt-1.5 text-[12px] text-on-forest-muted">
          {s.sold} av {s.count} sålda · resultat {kr(s.result)}
          {s.breakEven != null && ` · break-even vid ${s.breakEven} sålda`}
        </div>
      </TopBand>
      <Page>
        <button type="button" onClick={() => openDoorzo('', drop.id)} className="btn btn-sun min-h-[56px] w-full justify-start gap-3 px-4 text-left" aria-label={`Lägg till plagg i ${drop.name}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/50">
            <Plus size={20} strokeWidth={2.4} aria-hidden />
          </span>
          <span className="flex flex-col">
            <span className="text-[16px] font-semibold">Lägg till</span>
            <span className="text-[12px] font-normal opacity-80">Klistra in Doorzo-länkar, plaggen hamnar i {drop.name}</span>
          </span>
        </button>
        <div className="desk-cols desk-xl">
        <div className="desk-col xl:order-2">
        <Card>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Namn">
              <TextInput value={drop.name} onCommit={(v) => up({ name: v || drop.name })} />
            </Field>
            <Field label="Datum">
              <input type="date" className="field" value={drop.date} onChange={(e) => e.target.value && up({ date: e.target.value })} />
            </Field>
            <Field label="Frakt" hint={drop.shippingDate ? `bokförd ${drop.shippingDate}` : 'fördelas på vikt'}>
              <MoneyInput value={drop.shipping} onCommit={(v) => up({ shipping: v })} />
            </Field>
            <Field label="Tull och importmoms" hint={drop.customsDate ? `bokförd ${drop.customsDate}` : 'fördelas på inköpsvärde'}>
              <MoneyInput value={drop.customs} onCommit={(v) => up({ customs: v })} />
            </Field>
            <Field label="Status">
              <Select value={drop.status} options={['beställd', 'på väg', 'hemma'] as DropStatus[]} onChange={(v) => up({ status: v })} labels={{ beställd: 'Beställd', 'på väg': 'På väg', hemma: 'Hemma' }} />
            </Field>
            <Field label="Vikt totalt">
              <div className="field num flex items-center text-muted">{s.totalWeight.toLocaleString('sv-SE', { maximumFractionDigits: 2 })} kg</div>
            </Field>
          </div>
          <Field label="Anteckning">
            <TextInput value={drop.note} onCommit={(v) => up({ note: v })} placeholder="t.ex. Doorzo-ordernummer" />
          </Field>
          <div className="mt-3 flex gap-2">
            <button className="btn btn-soft flex-1 text-[14px]" onClick={() => setCost('shipping')}>
              + Frakt med datum
            </button>
            <button className="btn btn-soft flex-1 text-[14px]" onClick={() => setCost('customs')}>
              + Tull med datum
            </button>
          </div>
        </Card>
        </div>
        <div className="desk-col xl:row-span-2">

        <Section title={`Plagg · ${items.length}`}>
          <Chips
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Alla', count: items.length },
              { value: 'unsold', label: 'Osålda', count: items.length - s.sold },
              { value: 'sold', label: 'Sålda', count: s.sold },
            ]}
          />
          <Card pad={false} className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[14px]">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-left text-[12px] text-muted">
                  <th className="px-3 py-2 font-medium">Plagg</th>
                  <th className="px-2 py-2 text-right font-medium">Inköp</th>
                  <th className="px-2 py-2 text-right font-medium">Hemma</th>
                  <th className="px-2 py-2 text-right font-medium">Såld för</th>
                  <th className="px-3 py-2 text-right font-medium">Vinst</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => (
                  <tr key={l.item.id} className="border-t border-line-2">
                    <td className="max-w-[180px] px-3 py-2">
                      <a href={`#/lager/plagg/${l.item.id}`} className="block truncate font-medium">
                        {l.item.name}
                      </a>
                      <span className="block truncate text-[12px] text-muted">{[l.item.productId, l.item.brand, l.item.size].filter(Boolean).join(' · ')}</span>
                    </td>
                    <td className="w-[104px] px-1 py-1.5 lg:w-[136px]">
                      <MoneyInput value={l.item.cost} onCommit={(v) => void updateItem(l.item.id, { cost: v }, 'Inköpspris sparat')} />
                    </td>
                    <td className="num px-2 py-2 text-right text-muted">{Math.round(l.landed / 100)}</td>
                    <td className="w-[104px] px-1 py-1.5 lg:w-[136px]">
                      <MoneyInput value={l.item.salePrice} placeholder="–" onCommit={(v) => void updateItem(l.item.id, { salePrice: v }, v ? 'Försäljning sparad' : 'Försäljning ångrad')} />
                    </td>
                    <td className={cx('num px-3 py-2 text-right', (l.profit ?? 0) < 0 ? 'text-neg' : 'text-pos')}>{l.profit != null ? Math.round(l.profit / 100) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="m-0 px-1 text-[12px] text-muted">Skriv direkt i rutorna. Allt sparas när du lämnar rutan och räknas om överallt, även bokföringen. Hemkostnaden inkluderar frakt, tull och {kr(ds.settings.packaging)} förpackning.</p>
        </Section>
        </div>
        <div className="desk-col xl:order-3 xl:col-start-2">

        <DropPlanCard drop={drop} />

        <Section title="Lägg till plagg">
          <Card>
            <textarea className="field" value={paste} onChange={(e) => (findLinks(e.target.value).length ? openDoorzo(e.target.value, drop.id) : setPaste(e.target.value))} placeholder={'Ett per rad, pris sist\n3x Levi\'s 501 150\nBarbour jacka 224,90'} aria-label="Klistra in plagg" />
            <button
              className="btn btn-primary mt-2 w-full"
              disabled={!rows.length}
              onClick={async () => {
                if (await addItems(drop.id, rows)) {
                  setPaste('');
                  toast(`${rows.length} plagg tillagda`);
                }
              }}
            >
              Lägg till {rows.length || ''} plagg
            </button>
          </Card>
        </Section>

        <Attachments dropId={drop.id} />

        <ConfirmButton label="Ta bort drop" confirmLabel={`Ta bort ${drop.name} och ${items.length} plagg?`} onConfirm={() => void deleteDrop(drop.id).then(() => (go('#/lager/drops')))} />
        </div>
        </div>
      </Page>
      {cost && <CostSheet onClose={() => setCost(null)} preset={{ type: cost, dropId: drop.id }} />}
    </>
  );
}

// ---------- Ett plagg ----------

function ItemView({ id }: { id: string }) {
  const ds = useData();
  const item = ds.items.find((i) => i.id === id && !i.deletedAt);
  const [sell, setSell] = useState(false);
  if (!item) return <Missing what="Plagget" back="#/lager" />;
  const drop = ds.drops.find((d) => d.id === item.dropId)!;
  const L = landedForDrop(drop, itemsOfDrop(ds, drop.id), ds.settings.packaging).find((l) => l.item.id === item.id)!;
  const up = (p: Partial<Item>, label?: string) => void updateItem(item.id, p, label);
  const sold = isSold(item);
  const voucher = ds.vouchers.find((v) => !v.deletedAt && v.itemId === item.id);
  const age = daysBetween(drop.date, todayISO());
  return (
    <>
      <TopBand title={item.name} back={`#/lager/drop/${drop.id}`} sub={drop.name} right={<OkChip ok={item.ok} label={item.name} onChange={(v) => void setOk('items', item.id, v)} />}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {item.productId ? (
            <span className="num rounded-lg bg-white/12 px-2.5 py-1 text-[15px] font-medium tracking-wide text-on-forest">{item.productId}</span>
          ) : (
            <span className="rounded-lg border border-dashed border-white/30 px-2.5 py-1 text-[13px] text-on-forest-muted">Inget produkt-ID</span>
          )}
          {item.comment && <span className="text-[13px] text-on-forest-muted">{item.comment}</span>}
          {item.sourceUrl && (
            <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-[32px] items-center gap-1 text-[13px] font-semibold text-mint underline">
              <ExternalLink size={14} aria-hidden /> Köpt här (Doorzo)
            </a>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 text-[12px] text-on-forest-muted">
          <div>
            Hemkostnad
            <div className="num text-[17px] text-on-forest">{kr(L.landed)}</div>
          </div>
          <div>
            {sold ? 'Såld för' : 'Ålder'}
            <div className="num text-[17px] text-on-forest">{sold ? kr(item.salePrice) : `${age} dagar`}</div>
          </div>
          <div>
            Vinst
            <div className={cx('num text-[17px]', (L.profit ?? 0) >= 0 ? 'text-mint' : 'text-[#F4A08F]')}>{L.profit != null ? kr(L.profit) : '–'}</div>
          </div>
        </div>
      </TopBand>
      <Page>
        <div className="desk-cols desk-cols-even">
        <div className="desk-col">
        {sold ? (
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Såld {item.saleDate ?? '(datum saknas)'}</div>
                <div className="text-[13px] text-muted">
                  {item.platform ?? 'Plattform ej angiven'}
                  {voucher && (
                    <>
                      {' · '}
                      <a className="text-accent underline" href={`#/ekonomi/verifikat/${voucher.id}`}>
                        V{voucher.nr}
                      </a>
                    </>
                  )}
                  {item.saleBooking === 'aggregate' && ' · bokförd samlat med dropen'}
                </div>
              </div>
              <RoiPill roi={L.landed ? ((L.profit ?? 0) / L.landed) * 100 : null} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Såld för">
                <MoneyInput value={item.salePrice} onCommit={(v) => up({ salePrice: v })} />
              </Field>
              <Field label="Säljdatum">
                <input type="date" className="field" value={item.saleDate ?? ''} onChange={(e) => up({ saleDate: e.target.value || null })} />
              </Field>
              <Field label="Plattform">
                <Select value={(item.platform ?? 'Annat') as (typeof PLATFORMS)[number]} options={PLATFORMS} onChange={(v) => up({ platform: v })} />
              </Field>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost flex-1" onClick={() => void undoSale(item.id)}>
                Ångra försäljning
              </button>
              <button className="btn btn-ghost flex-1" onClick={() => void returnItem(item.id)}>
                <RotateCcw size={16} aria-hidden /> Retur
              </button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-sun" onClick={() => setSell(true)}>
              Registrera försäljning
            </button>
            <button
              className="btn btn-soft"
              onClick={() => {
                up({ listedAt: todayISO() }, 'Markerad som publicerad');
                toast('Markerad som publicerad idag');
              }}
            >
              {item.listedAt === todayISO() ? 'Publicerad idag ✓' : 'Publicerad om idag'}
            </button>
          </div>
        )}

        <Card className="grid grid-cols-2 gap-3">
          <Field label="Produkt-ID" hint="Det ID ni märker plagget med">
            <TextInput value={item.productId} onCommit={(v) => up({ productId: v.trim() }, 'Produkt-ID sparat')} placeholder="t.ex. TS-Gar-2026-207" />
          </Field>
          <Field label="Lagerplats">
            <TextInput value={item.location} onCommit={(v) => up({ location: v })} placeholder="t.ex. Låda 3" />
          </Field>
          <div className="col-span-2">
            <Field label="Kommentar">
              <CommentInput value={item.comment} onCommit={(v) => up({ comment: v }, 'Kommentar sparad')} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Namn">
              <TextInput value={item.name} onCommit={(v) => up({ name: v || item.name })} />
            </Field>
          </div>
          <Field label="Kategori">
            <Select value={item.category} options={CATEGORIES} onChange={(v) => up({ category: v })} />
          </Field>
          <Field label="Märke">
            <TextInput value={item.brand} onCommit={(v) => up({ brand: v })} />
          </Field>
          <Field label="Modell">
            <TextInput value={item.model} onCommit={(v) => up({ model: v })} />
          </Field>
          <Field label="Storlek">
            <TextInput value={item.size} onCommit={(v) => up({ size: v })} />
          </Field>
          <Field label="Inköpspris">
            <MoneyInput value={item.cost} onCommit={(v) => up({ cost: v })} />
          </Field>
          <Field label="Vikt (kg)">
            <TextInput value={item.weightKg ? String(item.weightKg).replace('.', ',') : ''} inputMode="decimal" onCommit={(v) => up({ weightKg: Math.max(0, parseFloat(v.replace(',', '.')) || 0) })} />
          </Field>
          <Field label="Senast publicerad">
            <input type="date" className="field" value={item.listedAt ?? ''} onChange={(e) => up({ listedAt: e.target.value || null })} />
          </Field>
        </Card>
        </div>
        <div className="desk-col">

        <AdCard item={item} />

        <Card>
          <div className="mb-2 font-semibold">Så räknas hemkostnaden</div>
          <dl className="m-0 grid grid-cols-[1fr_auto] gap-y-1 text-[14px]">
            <dt className="text-muted">Inköp</dt>
            <dd className="num m-0 text-right">{kr(item.cost, { decimals: true })}</dd>
            <dt className="text-muted">Andel frakt ({item.weightKg || 0} kg)</dt>
            <dd className="num m-0 text-right">{kr(L.shippingShare, { decimals: true })}</dd>
            <dt className="text-muted">Andel tull</dt>
            <dd className="num m-0 text-right">{kr(L.customsShare, { decimals: true })}</dd>
            <dt className="text-muted">Förpackning</dt>
            <dd className="num m-0 text-right">{kr(L.packaging, { decimals: true })}</dd>
            <dt className="border-t border-line-2 pt-1 font-semibold">Hemkostnad</dt>
            <dd className="num m-0 border-t border-line-2 pt-1 text-right font-semibold">{kr(L.landed, { decimals: true })}</dd>
          </dl>
        </Card>

        <div className="flex gap-2">
          <button className="btn btn-ghost flex-1" onClick={() => void setOk('items', item.id, 1)}>
            <CheckCircle2 size={16} aria-hidden /> Stämmer
          </button>
          <button className="btn btn-ghost flex-1" onClick={() => void setOk('items', item.id, 2)}>
            <AlertTriangle size={16} aria-hidden /> Fel
          </button>
        </div>
        <ConfirmButton label="Ta bort plagg" onConfirm={() => void deleteItem(item.id).then(() => (go(`#/lager/drop/${drop.id}`)))} />
        </div>
        </div>
      </Page>
      {sell && <SaleSheet onClose={() => setSell(false)} itemId={item.id} />}
    </>
  );
}

function Missing({ what, back }: { what: string; back: string }) {
  return (
    <>
      <TopBand title="Hittades inte" back={back} />
      <Page>
        <Empty title={`${what} finns inte längre`} text="Den kan ha tagits bort. Ångra finns i rutan längst ner direkt efter en ändring." />
      </Page>
    </>
  );
}

export function useDropOptions(ds: Dataset) {
  return live(ds.drops)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((d) => ({ value: d.id, label: d.name }));
}

export function ProductId({ id }: { id: string }) {
  return <span className="num shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted ring-1 ring-line">{id}</span>;
}

function CommentInput({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [s, setS] = useState(value);
  useEffect(() => setS(value), [value]);
  return <textarea className="field min-h-[72px]" value={s} placeholder="Skick, mått, annons-ID, vad som helst" onChange={(e) => setS(e.target.value)} onBlur={() => s !== value && onCommit(s)} />;
}

function AdCard({ item }: { item: Item }) {
  const ds = useData();
  const text = adText(item, ds.settings);
  const { filled, total } = measuresFilled(item);
  const keys = MEASURES[item.category];
  const setMeasure = (k: string, v: string) => {
    const n = Math.max(0, parseFloat(v.replace(',', '.')) || 0);
    const m = { ...(item.measurements ?? {}) };
    if (n) m[k] = n;
    else delete m[k];
    void updateItem(item.id, { measurements: m }, 'Mått sparade');
  };
  return (
    <Section title="Annons" action={<span className="text-muted">{filled}/{total} mått</span>}>
      <Card className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          {keys.map((k) => (
            <Field key={k} label={`${k} (cm)`}>
              <TextInput inputMode="decimal" value={item.measurements?.[k] ? String(item.measurements[k]).replace('.', ',') : ''} onCommit={(v) => setMeasure(k, v)} />
            </Field>
          ))}
          <Field label="Passform">
            <TextInput value={item.fit ?? ''} onCommit={(v) => void updateItem(item.id, { fit: v.trim() }, 'Passform sparad')} placeholder="t.ex. bootcut" />
          </Field>
        </div>
        <div className="whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-[15px] leading-relaxed">{text}</div>
        {filled < total && <p className="m-0 text-[12px] text-me">Fyll i alla mått innan du lägger upp annonsen.</p>}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            navigator.clipboard?.writeText(text).then(
              () => toast('Annonsen kopierad'),
              () => toast('Markera texten och kopiera', 'error'),
            )
          }
        >
          <Copy size={16} aria-hidden /> Kopiera annons
        </button>
      </Card>
    </Section>
  );
}
