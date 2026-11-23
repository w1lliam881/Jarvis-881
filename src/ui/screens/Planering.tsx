import { useMemo, useState } from 'react';
import { Bookmark, Check, Copy, Plus, Trash2, X } from 'lucide-react';
import { useData } from '../../data/store';
import { deleteSearch, saveWatch, buyCandidate, deleteCandidate, deleteGoal, deleteVideo, saveCandidate, saveGoal, saveSearch, saveVideo, setIdea, updateSettings } from '../../data/actions';
import { evaluateCandidate, maxPriceFor, orderPlan, rates } from '../../domain/calc';
import { buildSearch } from '../../domain/doorzo';
import { watchView } from '../../domain/watch';
import { todayISO } from '../../domain/dates';
import { history, live, allLanded } from '../../domain/metrics';
import { kr } from '../../domain/money';
import { assessIdea, marketingSummary, suggestIdeas, engagement, IDEAS, fill, ideaContext, type Filters } from '../../domain/video';
import { CATEGORIES, VIDEO_TYPES, type Candidate, type Category, type VideoPost, type VideoType } from '../../domain/types';
import type { Route } from '../router';
import { Bars, Card, Empty, Field, MoneyInput, Page, Pill, Section, Select, Sheet, Stat, TextInput, Toggle, TopBand, cx } from '../components/ui';
import { toast } from '../Boot';

const VIEWS = [
  { value: 'kalkyl', label: 'Kalkyl' },
  { value: 'framtid', label: 'Framtid' },
  { value: 'doorzo', label: 'Doorzo' },
  { value: 'marknad', label: 'Marknad' },
  { value: 'video', label: 'Video' },
] as const;

export function Planering({ route }: { route: Route }) {
  const sub = route.path[1];
  const view = (VIEWS.find((v) => v.value === sub)?.value ?? 'kalkyl') as (typeof VIEWS)[number]['value'];
  return (
    <>
      <TopBand title="Planering" back="#/mer" sub="Inköp, budget och innehåll">
        <div className="-mx-1 overflow-x-auto px-1">
          <div className="flex min-w-max gap-1 rounded-xl bg-white/10 p-1">
            {VIEWS.map((v) => (
              <a key={v.value} href={`#/planering/${v.value}`} className={cx('min-h-[36px] rounded-lg px-3 py-2 text-[13px] font-semibold', view === v.value ? 'bg-on-forest text-forest' : 'text-on-forest-muted')}>
                {v.label}
              </a>
            ))}
          </div>
        </div>
      </TopBand>
      <Page>
        {view === 'kalkyl' && <Kalkyl />}
        {view === 'framtid' && <Framtid />}
        {view === 'doorzo' && <Doorzo />}
        {view === 'marknad' && <Marknad />}
        {view === 'video' && <Video />}
      </Page>
    </>
  );
}

// ---------- Kalkyl ----------

function Kalkyl() {
  const ds = useData();
  const H = useMemo(() => history(ds, todayISO()), [ds]);
  const R = rates(H, ds.settings);
  const [f, setF] = useState({ name: '', category: 'Jeans' as Category, brand: '', size: '', price: 0, weightKg: 0, plannedSalePrice: 0 });
  const preview = f.price ? evaluateCandidate(f, H, ds.settings) : null;
  const cands = live(ds.candidates).slice().reverse();
  const s = ds.settings;
  return (
    <div className="desk-cols desk-cols-even">
      <Card className="flex flex-col gap-3">
        <div className="font-semibold">Nytt plagg från Doorzo</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Plagg">
              <input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="t.ex. Levi's 501 vintage" />
            </Field>
          </div>
          <Field label="Kategori">
            <Select value={f.category} options={CATEGORIES} onChange={(v) => setF({ ...f, category: v })} />
          </Field>
          <Field label="Märke">
            <input className="field" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} />
          </Field>
          <Field label="Pris inkl. avgift">
            <MoneyInput value={f.price} onCommit={(v) => setF({ ...f, price: v })} />
          </Field>
          <Field label="Ditt säljpris">
            <MoneyInput value={f.plannedSalePrice} onCommit={(v) => setF({ ...f, plannedSalePrice: v })} />
          </Field>
          <Field label="Storlek">
            <input className="field" value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} />
          </Field>
          <Field label="Vikt kg (valfritt)">
            <input className="field" inputMode="decimal" value={f.weightKg || ''} onChange={(e) => setF({ ...f, weightKg: parseFloat(e.target.value.replace(',', '.')) || 0 })} />
          </Field>
        </div>
        {preview && <CalcTable c={preview} sale={f.plannedSalePrice} />}
        <button
          className="btn btn-primary"
          disabled={!f.name || !f.price}
          onClick={async () => {
            if (await saveCandidate(f)) setF({ ...f, name: '', price: 0, plannedSalePrice: 0, weightKg: 0, size: '' });
          }}
        >
          Spara kalkyl
        </button>
        <p className="m-0 text-[12px] text-muted">
          {R.learned ? `Frakt ${Math.round(R.shippingPerKg / 100)} kr/kg och tull ${Math.round(R.customsRate * 1000) / 10} % lärt från dina drops.` : `Ingen historik: ${Math.round(R.shippingPerKg / 100)} kr/kg frakt och ${Math.round(R.customsRate * 1000) / 10} % tull och moms.`} Du bestämmer alltid själv säljpriset.
        </p>
      </Card>
      <div className="desk-col">
      {cands.map((c) => (
        <CandidateCard key={c.id} c={c} />
      ))}
      <details className="card p-4">
        <summary className="cursor-pointer font-semibold">Mina krav</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Min ROI (%)">
            <TextInput inputMode="numeric" value={String(s.minRoiPct)} onCommit={(v) => void updateSettings({ minRoiPct: Math.max(0, parseFloat(v) || 0) })} />
          </Field>
          <Field label="Min vinst">
            <MoneyInput value={s.minProfit} onCommit={(v) => void updateSettings({ minProfit: v })} />
          </Field>
          <Field label="Förpackning per plagg">
            <MoneyInput value={s.packaging} onCommit={(v) => void updateSettings({ packaging: v })} />
          </Field>
          <Field label="Frakt kr/kg (utan historik)">
            <MoneyInput value={s.shippingPerKg} onCommit={(v) => void updateSettings({ shippingPerKg: v })} />
          </Field>
        </div>
      </details>
      </div>
    </div>
  );
}

function CalcTable({ c, sale }: { c: ReturnType<typeof evaluateCandidate>; sale: number }) {
  const tone = c.verdict === 'Köp' ? 'lo' : c.verdict === 'Tveksam' ? 'me' : 'hi';
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] text-muted">Omdöme</span>
        <Pill tone={tone}>{c.verdict}</Pill>
      </div>
      <dl className="m-0 grid grid-cols-[1fr_auto] gap-y-1 text-[14px]">
        <dt className="text-muted">Frakt ({c.weightKg.toLocaleString('sv-SE', { maximumFractionDigits: 2 })} kg)</dt>
        <dd className="num m-0 text-right">{kr(c.shipping)}</dd>
        <dt className="text-muted">Tull och moms</dt>
        <dd className="num m-0 text-right">{kr(c.customs)}</dd>
        <dt className="text-muted">Förpackning</dt>
        <dd className="num m-0 text-right">{kr(c.packaging)}</dd>
        <dt className="font-semibold">Totalt hemma</dt>
        <dd className="num m-0 text-right font-semibold">{kr(c.landed)}</dd>
        {sale > 0 && (
          <>
            <dt className="text-muted">Vinst / ROI</dt>
            <dd className={cx('num m-0 text-right', c.profit >= 0 ? 'text-pos' : 'text-neg')}>
              {kr(c.profit)} / {Math.round(c.roi)} %
            </dd>
          </>
        )}
      </dl>
      {c.reasons.length > 0 && <p className="m-0 mt-2 text-[13px] text-muted">{c.reasons.join('. ')}.</p>}
    </div>
  );
}

function CandidateCard({ c }: { c: Candidate }) {
  const ds = useData();
  const H = useMemo(() => history(ds, todayISO()), [ds]);
  const r = evaluateCandidate(c, H, ds.settings);
  const max = maxPriceFor(c.category, H, ds.settings);
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">{c.name}</div>
          <div className="text-[12px] text-muted">{[c.brand, c.size, c.category].filter(Boolean).join(' · ')}</div>
        </div>
        <button aria-label="Ta bort kalkyl" className="grid h-9 w-9 place-items-center text-muted" onClick={() => void deleteCandidate(c.id)}>
          <X size={18} aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Pris">
          <MoneyInput value={c.price} onCommit={(v) => void saveCandidate({ price: v }, c.id)} />
        </Field>
        <Field label="Säljpris">
          <MoneyInput value={c.plannedSalePrice} onCommit={(v) => void saveCandidate({ plannedSalePrice: v }, c.id)} />
        </Field>
        <Field label="Vikt kg">
          <TextInput inputMode="decimal" value={c.weightKg ? String(c.weightKg) : ''} onCommit={(v) => void saveCandidate({ weightKg: parseFloat(v.replace(',', '.')) || 0 }, c.id)} />
        </Field>
      </div>
      <CalcTable c={r} sale={c.plannedSalePrice} />
      {max?.maxPrice != null && (
        <p className="m-0 text-[13px] text-muted">
          Maxpris för {c.category.toLowerCase()} enligt dina krav: <b className="num text-text">{kr(max.maxPrice)}</b> (snitt sålt {kr(max.avgSale)}, {max.basis} sålda).
        </p>
      )}
      <button className="btn btn-soft" onClick={() => void buyCandidate(c.id, r.weightKg).then((ok) => ok && toast('Lagt i en beställd drop'))}>
        Köpt, lägg i drop
      </button>
    </Card>
  );
}

// ---------- Framtid ----------

function Framtid() {
  const ds = useData();
  const today = todayISO();
  const plan = useMemo(() => orderPlan(ds, today), [ds, today]);
  const H = useMemo(() => history(ds, today), [ds, today]);
  const s = ds.settings;
  const goals = live(ds.goals);
  const [gName, setGName] = useState('');
  const [gTarget, setGTarget] = useState('');
  const [gKind, setGKind] = useState<'monthRevenue' | 'monthProfit' | 'monthSold' | 'manual'>('monthRevenue');
  return (
    <div className="desk-flow">
      <Section title="Budget för nästa drop">
        <Card className="flex flex-col gap-3">
          <Field label="Budget" hint="Lämna tomt för att räkna antal utifrån försäljningstakten istället.">
            <MoneyInput value={s.budget} onCommit={(v) => void updateSettings({ budget: v })} />
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Stat label="Antal plagg" value={`${plan.qty} st`} />
            <Stat label="Budget" value={kr(plan.budget)} />
            <Stat label="Beställ senast" value={plan.orderBy === 'nu' ? 'Nu' : plan.orderBy} />
            <Stat label="Förväntad vinst" value={<span className="text-pos">{kr(plan.expectedProfit)}</span>} />
            <Stat label="Sålda per vecka" value={plan.salesPerWeek.toFixed(1)} />
            <Stat label="Lagret räcker" value={`${plan.weeksOfStock.toFixed(1)} v`} sub={`${plan.stock} osålda`} />
          </div>
        </Card>
      </Section>
      <Section title="Fördelning och maxpris per kategori">
        <Card pad={false} className="overflow-x-auto">
          <table className="w-full min-w-[460px] text-[13px]">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                <th className="px-3 py-2 font-medium">Kategori</th>
                <th className="px-2 py-2 text-right font-medium">Andel</th>
                <th className="px-2 py-2 text-right font-medium">Antal</th>
                <th className="px-2 py-2 text-right font-medium">Budget</th>
                <th className="px-2 py-2 text-right font-medium">Maxpris</th>
                <th className="px-3 py-2 text-right font-medium">Vinst/st</th>
              </tr>
            </thead>
            <tbody>
              {plan.rows.map((r) => (
                <tr key={r.category} className="border-t border-line-2">
                  <td className="px-3 py-2">{r.category}</td>
                  <td className="num px-2 py-2 text-right">{Math.round(r.share * 100)} %</td>
                  <td className="num px-2 py-2 text-right">{r.qty}</td>
                  <td className="num px-2 py-2 text-right">{kr(r.budget, { unit: false })}</td>
                  <td className="num px-2 py-2 text-right font-semibold">{r.maxPrice != null ? kr(r.maxPrice, { unit: false }) : '–'}</td>
                  <td className="num px-3 py-2 text-right">{kr(r.profitPerItem, { unit: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="m-0 px-1 text-[12px] text-muted">
          Maxpris = högsta inköpspris före frakt och tull som ger minst {s.minRoiPct} % ROI och {kr(s.minProfit)} vinst vid ditt snittpris i kategorin. Frakt {Math.round(rates(H, s).shippingPerKg / 100)} kr/kg. Fördelningen viktas efter vinst och hur stor andel som säljs. Jarvis sätter aldrig pris på enskilda plagg.
        </p>
      </Section>
      <details className="card p-4">
        <summary className="cursor-pointer font-semibold">Antaganden</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Egen uppskattning sålda/vecka" hint="0 = räknas från historiken">
            <TextInput inputMode="decimal" value={String(s.salesPerWeekOverride)} onCommit={(v) => void updateSettings({ salesPerWeekOverride: parseFloat(v.replace(',', '.')) || 0 })} />
          </Field>
          <Field label="Leveranstid (veckor)">
            <TextInput inputMode="decimal" value={String(s.leadWeeks)} onCommit={(v) => void updateSettings({ leadWeeks: parseFloat(v.replace(',', '.')) || 0 })} />
          </Field>
          <Field label="Täckning efter leverans (veckor)">
            <TextInput inputMode="decimal" value={String(s.coverWeeks)} onCommit={(v) => void updateSettings({ coverWeeks: parseFloat(v.replace(',', '.')) || 0 })} />
          </Field>
          <Field label="Tull och moms (% av varor + frakt)">
            <TextInput inputMode="decimal" value={String(Math.round(s.customsRate * 1000) / 10)} onCommit={(v) => void updateSettings({ customsRate: (parseFloat(v.replace(',', '.')) || 0) / 100 })} />
          </Field>
        </div>
      </details>
      <Section title="Mål">
        <Card className="flex flex-col gap-3">
          {goals.map((g) => {
            const cur = goalCurrent(ds, g);
            return (
              <div key={g.id} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <b className="text-[14px]">{g.name}</b>
                  <span className="num text-[13px] text-muted">
                    {Math.round(cur).toLocaleString('sv-SE')} / {g.target.toLocaleString('sv-SE')} {g.unit}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-2">
                    <i className="block h-full rounded-full" style={{ width: `${Math.min(100, (cur / Math.max(1, g.target)) * 100)}%`, background: 'linear-gradient(90deg,var(--mint),var(--sun))' }} />
                  </div>
                  {g.kind === 'manual' && <input className="field num h-9 min-h-0 w-24 py-1" inputMode="decimal" defaultValue={g.current} onBlur={(e) => void saveGoal({ name: g.name, current: parseFloat(e.target.value) || 0 }, g.id)} aria-label="Nuläge" />}
                  <button aria-label={`Ta bort mål ${g.name}`} className="grid h-9 w-9 place-items-center text-muted" onClick={() => void deleteGoal(g.id)}>
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-2 gap-2 border-t border-line-2 pt-3">
            <Field label="Nytt mål">
              <input className="field" value={gName} onChange={(e) => setGName(e.target.value)} placeholder="t.ex. Försäljning per månad" />
            </Field>
            <Field label="Målvärde">
              <input className="field num" inputMode="decimal" value={gTarget} onChange={(e) => setGTarget(e.target.value)} />
            </Field>
            <Field label="Räknas automatiskt från">
              <select className="field" value={gKind} onChange={(e) => setGKind(e.target.value as typeof gKind)}>
                <option value="monthRevenue">Sålt denna månad (kr)</option>
                <option value="monthProfit">Resultat denna månad (kr)</option>
                <option value="monthSold">Sålda plagg denna månad</option>
                <option value="manual">Eget, jag fyller i själv</option>
              </select>
            </Field>
            <div className="flex items-end">
              <button
                className="btn btn-primary w-full"
                disabled={!gName || !gTarget}
                onClick={async () => {
                  if (await saveGoal({ name: gName, target: parseFloat(gTarget.replace(',', '.')) || 0, kind: gKind, unit: gKind === 'monthSold' ? 'st' : gKind === 'manual' ? '' : 'kr' })) {
                    setGName('');
                    setGTarget('');
                  }
                }}
              >
                <Plus size={16} aria-hidden /> Lägg till
              </button>
            </div>
          </div>
        </Card>
      </Section>
    </div>
  );
}

function goalCurrent(ds: ReturnType<typeof useData>, g: { kind: string; current: number }) {
  const m = todayISO().slice(0, 7);
  const L = allLanded(ds).filter((l) => l.item.salePrice > 0 && (l.item.saleDate ?? '').startsWith(m));
  if (g.kind === 'monthRevenue') return L.reduce((s, l) => s + l.item.salePrice, 0) / 100;
  if (g.kind === 'monthProfit') return L.reduce((s, l) => s + (l.profit ?? 0), 0) / 100;
  if (g.kind === 'monthSold') return L.length;
  return g.current;
}

// ---------- Doorzo ----------

function Doorzo() {
  const ds = useData();
  const [q, setQ] = useState('');
  const [run, setRun] = useState('');
  const res = useMemo(() => (run ? buildSearch(run) : null), [run]);
  const saved = live(ds.searches).filter((x) => !x.watch).slice().reverse();
  const copy = (t: string) =>
    navigator.clipboard?.writeText(t).then(
      () => toast(`Kopierat: ${t}`),
      () => toast(t),
    );
  return (
    <>
      <div className="desk-flow">
      <Card className="flex flex-col gap-2">
        <Field label="Vad letar du efter?" hint="Skriv på svenska: märke, plagg, detaljer, storlek. T.ex. &quot;Levi's 501 vintage W32 svarta&quot;">
          <input className="field" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setRun(q)} />
        </Field>
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1" disabled={!q.trim()} onClick={() => setRun(q)}>
            Ta fram söktermer
          </button>
          <button className="btn btn-ghost w-12 px-0" disabled={!q.trim()} aria-label="Spara sökning" onClick={() => void saveSearch(q.trim())}>
            <Bookmark size={18} aria-hidden />
          </button>
        </div>
        {saved.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {saved.slice(0, 8).map((s) => (
              <button key={s.id} className="min-h-[32px] rounded-full border border-line px-3 text-[13px] text-muted" onClick={() => (setQ(s.query), setRun(s.query))}>
                {s.query}
              </button>
            ))}
          </div>
        )}
      </Card>
      <Watches query={run || q} />
      </div>
      {res && res.understood.length > 0 && <p className="m-0 px-1 text-[13px] text-muted">Förstod: {res.understood.join(', ')}</p>}
      {res && !res.groups.length && <Empty title="Inga söktermer" text="Prova ett märke eller ett plaggord, t.ex. jeans, jacka eller tröja." />}
      <div className="desk-grid2">
      {res?.groups.map((g) => (
        <Section key={g.title} title={g.title}>
          <Card pad={false}>
            {g.terms.map((t) => (
              <div key={t.ja} className="flex min-h-[60px] items-center gap-3 border-b border-line-2 px-4 py-2.5 last:border-0">
                <span className="min-w-0 flex-1">
                  <span className="block break-all text-[17px]" lang="ja">
                    {t.ja}
                  </span>
                  <span className="block text-[13px] text-muted">{t.sv}</span>
                  {t.tip && <span className="block text-[12px] text-me">{t.tip}</span>}
                </span>
                <button className="btn btn-soft h-10 min-h-0 w-12 shrink-0 px-0" aria-label={`Kopiera ${t.sv}`} onClick={() => copy(t.ja)}>
                  <Copy size={16} aria-hidden />
                </button>
              </div>
            ))}
          </Card>
        </Section>
      ))}
      </div>
    </>
  );
}

// ---------- Marknadsföring ----------

function Marknad() {
  const ds = useData();
  const sum = useMemo(() => marketingSummary(ds), [ds]);
  const [edit, setEdit] = useState<VideoPost | 'new' | null>(null);
  const vids = live(ds.videos).slice().sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1));
  return (
    <>
      <button className="btn btn-primary lg:self-start lg:px-6" onClick={() => setEdit('new')}>
        <Plus size={18} aria-hidden /> Logga klipp
      </button>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
        <Stat label="Klipp" value={sum.count} sub={`${sum.withStats} med statistik`} />
        <Stat label="Visningar" value={sum.totals.views.toLocaleString('sv-SE')} />
        <Stat label="Likes" value={sum.totals.likes.toLocaleString('sv-SE')} />
        <Stat label="Delningar och sparade" value={(sum.totals.shares + sum.totals.saves).toLocaleString('sv-SE')} />
      </div>
      {sum.insights.length > 0 && (
        <Card className="flex flex-col gap-1.5">
          <div className="font-semibold">Det här ser jag</div>
          {sum.insights.map((i) => (
            <p key={i} className="m-0 text-[14px]">
              {i}
            </p>
          ))}
        </Card>
      )}
      {sum.byType.length > 0 && (
        <Section title="Engagemang per videotyp">
          <Card>
            <Bars rows={sum.byType.map((t) => ({ label: t.type, value: t.avgEng, sub: `${(t.avgEng * 100).toFixed(1)} % · ${Math.round(t.avgViews).toLocaleString('sv-SE')} visn. · ${t.count} st` }))} />
          </Card>
        </Section>
      )}
      {sum.withStats >= 2 && (
        <Section title="Längd">
          <Card>
            <Bars rows={sum.lenBuckets.filter((b) => b.count).map((b) => ({ label: b.label, value: b.avgViews, sub: `${Math.round(b.avgViews).toLocaleString('sv-SE')} visn. · ${b.count} st` }))} />
          </Card>
        </Section>
      )}
      {sum.topSongs.length > 0 && (
        <Section title="Låtar">
          <Card>
            <Bars rows={sum.topSongs.map((s) => ({ label: s.song, value: s.avgViews, sub: `${Math.round(s.avgViews).toLocaleString('sv-SE')} visn. · ${s.count} st` }))} />
          </Card>
        </Section>
      )}
      <Section title="Alla klipp">
        <Card pad={false}>
          {vids.map((v) => (
            <button key={v.id} type="button" onClick={() => setEdit(v)} className="flex min-h-[56px] w-full items-center gap-3 border-b border-line-2 px-4 py-2 text-left last:border-0 active:bg-surface-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px]">{v.title || v.type}</span>
                <span className="block text-[12px] text-muted">
                  {v.postedAt.slice(0, 10)} · {v.type} · {v.lengthSec} s
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="num text-[14px]">{v.views ? v.views.toLocaleString('sv-SE') : '–'}</span>
                <span className="text-[11px] text-muted">{v.views ? `${(engagement(v) * 100).toFixed(1)} % eng.` : 'saknar statistik'}</span>
              </span>
            </button>
          ))}
          {!vids.length && <p className="m-0 p-4 text-[14px] text-muted">Logga ditt första klipp. Efter några klipp ser du vad som fungerar bäst.</p>}
        </Card>
      </Section>
      {edit && <VideoSheet v={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function VideoSheet({ v, onClose }: { v: VideoPost | null; onClose: () => void }) {
  const ds = useData();
  const [f, setF] = useState<Partial<VideoPost>>(
    v ?? { platform: 'TikTok', type: ds.settings.videoTypes[0] ?? 'Process', title: '', postedAt: new Date().toISOString(), lengthSec: 30, song: '', views: 0, likes: 0, comments: 0, shares: 0, saves: 0, dropIds: [], itemIds: [], note: '' },
  );
  const local = (iso: string) => {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const num = (k: keyof VideoPost, label: string) => (
    <Field label={label}>
      <input className="field num" inputMode="numeric" value={(f[k] as number) || ''} onChange={(e) => setF({ ...f, [k]: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })} />
    </Field>
  );
  const drops = live(ds.drops).sort((a, b) => (a.date < b.date ? 1 : -1));
  const items = allLanded(ds).filter((l) => (f.dropIds ?? []).includes(l.drop.id));
  return (
    <Sheet
      open
      onClose={onClose}
      title={v ? 'Klipp' : 'Logga klipp'}
      footer={
        <div className="mb-1 flex gap-2">
          {v && (
            <button className="btn btn-ghost w-12 px-0" aria-label="Ta bort klipp" onClick={() => void deleteVideo(v.id).then(onClose)}>
              <Trash2 size={18} aria-hidden />
            </button>
          )}
          <button className="btn btn-primary flex-1" onClick={() => void saveVideo(f, v?.id).then((ok) => ok && onClose())}>
            Spara
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Titel eller kort beskrivning">
          <input className="field" value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Typ">
            <Select value={(f.type ?? 'Process') as VideoType} options={VIDEO_TYPES} onChange={(t) => setF({ ...f, type: t })} />
          </Field>
          <Field label="Plattform">
            <Select value={(f.platform ?? 'TikTok') as VideoPost['platform']} options={['TikTok', 'Instagram', 'YouTube Shorts'] as const} onChange={(p) => setF({ ...f, platform: p })} />
          </Field>
          <Field label="Publicerad">
            <input type="datetime-local" className="field" value={local(f.postedAt ?? new Date().toISOString())} onChange={(e) => e.target.value && setF({ ...f, postedAt: new Date(e.target.value).toISOString() })} />
          </Field>
          {num('lengthSec', 'Längd (sek)')}
        </div>
        <Field label="Låt">
          <input className="field" value={f.song ?? ''} onChange={(e) => setF({ ...f, song: e.target.value })} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          {num('views', 'Visningar')}
          {num('likes', 'Likes')}
          {num('comments', 'Kommentarer')}
          {num('shares', 'Delningar')}
          {num('saves', 'Sparade')}
        </div>
        <Field label="Drops i klippet">
          <div className="flex flex-wrap gap-1.5">
            {drops.slice(0, 10).map((d) => {
              const on = (f.dropIds ?? []).includes(d.id);
              return (
                <button key={d.id} type="button" className={cx('min-h-[34px] rounded-full border px-3 text-[13px]', on ? 'border-transparent bg-forest text-on-forest' : 'border-line text-muted')} onClick={() => setF({ ...f, dropIds: on ? (f.dropIds ?? []).filter((x) => x !== d.id) : [...(f.dropIds ?? []), d.id] })}>
                  {d.name}
                </button>
              );
            })}
          </div>
        </Field>
        {items.length > 0 && (
          <Field label="Plagg som visas" hint="Används för att se om plagg säljs efter att de visats.">
            <div className="flex max-h-48 flex-col gap-1 overflow-auto">
              {items.map((l) => {
                const on = (f.itemIds ?? []).includes(l.item.id);
                return (
                  <label key={l.item.id} className="flex min-h-[36px] items-center gap-2 text-[14px]">
                    <input type="checkbox" className="h-5 w-5" checked={on} onChange={() => setF({ ...f, itemIds: on ? (f.itemIds ?? []).filter((x) => x !== l.item.id) : [...(f.itemIds ?? []), l.item.id] })} />
                    {l.item.name}
                  </label>
                );
              })}
            </div>
          </Field>
        )}
        <Field label="Anteckning">
          <textarea className="field" value={f.note ?? ''} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
      </div>
    </Sheet>
  );
}

// ---------- Video ----------

function Video() {
  const ds = useData();
  const s = ds.settings;
  const [f, setF] = useState<Filters>({ type: 'Alla', length: 0 });
  const [seed, setSeed] = useState(0);
  const ideas = useMemo(() => suggestIdeas(ds, f, 5 + seed * 5), [ds, f, seed]);
  const saved = live(ds.ideas).filter((i) => i.status === 'sparad');
  const [own, setOwn] = useState({ text: '', type: (s.videoTypes[0] ?? 'Process') as VideoType, lengthSec: 30, hour: 19 });
  const assess = own.text.trim() ? assessIdea(ds, own) : null;
  return (
    <>
      <details className="card p-4" open={!s.videoTypes.length}>
        <summary className="cursor-pointer font-semibold">Mina videor och förutsättningar</summary>
        <p className="mb-2 mt-1 text-[13px] text-muted">Vilka typer brukar du göra? Idéerna anpassas efter det och efter vad som fungerat i din statistik.</p>
        <div className="flex flex-wrap gap-1.5">
          {VIDEO_TYPES.map((t) => {
            const on = s.videoTypes.includes(t);
            return (
              <button key={t} type="button" className={cx('min-h-[36px] rounded-full border px-3 text-[13px] font-semibold', on ? 'border-transparent bg-forest text-on-forest' : 'border-line text-muted')} onClick={() => void updateSettings({ videoTypes: on ? s.videoTypes.filter((x) => x !== t) : [...s.videoTypes, t] })}>
                {on && <Check size={14} className="mr-1 inline" aria-hidden />}
                {t}
              </button>
            );
          })}
        </div>
        <div className="mt-2">
          {(
            [
              ['face', 'Kan visa ansiktet'],
              ['voice', 'Kan prata'],
              ['package', 'Har paket att packa upp'],
              ['garments', 'Har plagg hemma'],
              ['time', 'Har över en timme'],
            ] as const
          ).map(([k, l]) => (
            <Toggle key={k} label={l} checked={s.videoAbilities[k]} onChange={(v) => void updateSettings({ videoAbilities: { ...s.videoAbilities, [k]: v } })} />
          ))}
        </div>
      </details>

      <Section title="Bedöm min idé">
        <Card className="flex flex-col gap-3">
          <Field label="Beskriv idén" hint="Vad syns, vad sägs i början och hur slutar den?">
            <textarea className="field" value={own.text} onChange={(e) => setOwn({ ...own, text: e.target.value })} placeholder="t.ex. Gissa vad jag betalade för de här Levi's 505 från Japan, sedan visar jag frakt och tull" />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Typ">
              <Select value={own.type} options={VIDEO_TYPES} onChange={(t) => setOwn({ ...own, type: t })} />
            </Field>
            <Field label="Längd (s)">
              <input className="field num" inputMode="numeric" value={own.lengthSec} onChange={(e) => setOwn({ ...own, lengthSec: parseInt(e.target.value, 10) || 0 })} />
            </Field>
            <Field label="Postar kl">
              <input className="field num" inputMode="numeric" value={own.hour} onChange={(e) => setOwn({ ...own, hour: Math.min(23, parseInt(e.target.value, 10) || 0) })} />
            </Field>
          </div>
          {assess && (
            <div className="rounded-xl bg-surface-2 p-3">
              <div className="mb-2 flex items-center justify-between">
                <b>{assess.verdict}</b>
                <span className="num text-[20px] font-semibold">{assess.score}/10</span>
              </div>
              {assess.good.map((g) => (
                <p key={g} className="m-0 text-[14px] text-pos">
                  + {g}
                </p>
              ))}
              {assess.improve.map((g) => (
                <p key={g} className="m-0 text-[14px] text-me">
                  → {g}
                </p>
              ))}
            </div>
          )}
        </Card>
      </Section>

      <Section title="Idéer till dig" action={<button onClick={() => setSeed(seed + 1)}>Fler</button>}>
        <div className="grid grid-cols-2 gap-2">
          <select className="field" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Filters['type'] })} aria-label="Typ">
            <option value="Alla">Alla typer</option>
            {VIDEO_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select className="field" value={f.length} onChange={(e) => setF({ ...f, length: +e.target.value })} aria-label="Längd">
            <option value={0}>Alla längder</option>
            <option value={15}>Cirka 15 s</option>
            <option value={30}>Cirka 30 s</option>
            <option value={60}>Cirka 60 s</option>
          </select>
        </div>
        {ideas.map((i) => {
          const st = live(ds.ideas).find((x) => x.ideaKey === i.idea.key)?.status;
          return (
            <Card key={i.idea.key} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <b className="text-[15px]">{i.title}</b>
                <Pill tone="neutral">{i.idea.type}</Pill>
              </div>
              <p className="m-0 font-serif text-[16px] italic">"{i.hook}"</p>
              <p className="m-0 text-[14px]">{i.setup}</p>
              <p className="m-0 text-[13px] text-muted">
                Cirka {i.idea.length} s · {i.tip}
              </p>
              {i.why.length > 0 && <p className="m-0 text-[12px] text-accent">{i.why.join(' · ')}</p>}
              <div className="flex gap-2">
                <button className="btn btn-soft h-10 min-h-0 flex-1 text-[14px]" onClick={() => void setIdea(i.idea.key, st === 'sparad' ? null : 'sparad')}>
                  {st === 'sparad' ? 'Sparad ✓' : 'Spara'}
                </button>
                <button className="btn btn-ghost h-10 min-h-0 flex-1 text-[14px]" onClick={() => void setIdea(i.idea.key, 'använd')}>
                  Gjord
                </button>
                <button className="btn btn-ghost h-10 min-h-0 w-10 px-0" aria-label="Inte intresserad" onClick={() => void setIdea(i.idea.key, 'avfärdad')}>
                  <X size={16} aria-hidden />
                </button>
              </div>
            </Card>
          );
        })}
        {!ideas.length && <Empty title="Inga nya idéer med de här filtren" text="Ändra filtren eller förutsättningarna." />}
      </Section>
      {saved.length > 0 && (
        <Section title={`Sparade idéer · ${saved.length}`}>
          <Card pad={false}>
            {saved.map((x) => (
              <div key={x.id} className="flex min-h-[48px] items-center justify-between gap-2 border-b border-line-2 px-4 py-2 last:border-0 text-[14px]">
                <span className="truncate">{(() => { const t = IDEAS.find((i) => i.key === x.ideaKey); return t ? fill(t.title, ideaContext(ds)) : x.ideaKey; })()}</span>
                <button className="text-[13px] font-semibold text-accent" onClick={() => void setIdea(x.ideaKey, 'använd')}>
                  Gjord
                </button>
              </div>
            ))}
          </Card>
        </Section>
      )}
    </>
  );
}

function Watches({ query }: { query: string }) {
  const ds = useData();
  const H = useMemo(() => history(ds, todayISO()), [ds]);
  const watches = live(ds.searches).filter((x) => x.watch);
  const [cat, setCat] = useState<Category>('Jeans');
  const [max, setMax] = useState(0);
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => toast(`Kopierat: ${t}`), () => toast(t));
  return (
    <Section title={`Bevakningar${watches.length ? ` · ${watches.length}` : ''}`}>
      {watches.map((w) => {
        const v = watchView(w, H, ds.settings);
        return (
          <Card key={w.id} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold">{w.query}</div>
                <div className="text-[12px] text-muted">
                  {w.category ?? 'Alla kategorier'}
                  {v.maxPrice ? ` · maxpris ${kr(v.maxPrice)} (ca ${v.maxYen?.toLocaleString('sv-SE')} yen, ${v.maxSource === 'eget' ? 'eget' : 'från dina krav'})` : ''}
                </div>
              </div>
              <button aria-label={`Ta bort bevakningen ${w.query}`} className="grid h-9 w-9 place-items-center text-muted" onClick={() => void deleteSearch(w.id)}>
                <Trash2 size={16} aria-hidden />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {v.terms.slice(0, 4).map((t) => (
                <button key={t.ja} type="button" onClick={() => copy(t.ja)} className="min-h-[34px] rounded-lg border border-line px-2.5 text-left text-[13px]" title={t.sv}>
                  <span lang="ja">{t.ja}</span> <Copy size={12} className="inline text-muted" aria-hidden />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {v.links.map((l) => (
                <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="btn btn-soft h-10 min-h-0 flex-1 text-[14px]">
                  Öppna {l.label}
                </a>
              ))}
            </div>
            <p className="m-0 text-[12px] text-muted">Hittar du något: lägg in det i Kalkyl så får du Köp, Tveksam eller Avstå. På Doorzo klistrar du in en kopierad sökterm.</p>
          </Card>
        );
      })}
      <Card className="flex flex-col gap-2">
        <div className="text-[14px]">
          Bevaka <b>{query.trim() || 'en sökning'}</b> och få påminnelse varje dag.
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Kategori">
            <Select value={cat} options={CATEGORIES} onChange={setCat} />
          </Field>
          <Field label="Eget maxpris" hint="Tomt = räknas från dina krav">
            <MoneyInput value={max} onCommit={setMax} />
          </Field>
        </div>
        <button className="btn btn-primary" disabled={!query.trim()} onClick={() => void saveWatch({ query: query.trim(), category: cat, maxPrice: max || null }).then((ok) => ok && setMax(0))}>
          Lägg till bevakning
        </button>
        <p className="m-0 text-[12px] text-muted">Jarvis söker inte automatiskt på sajterna. Du får färdiga sökningar och en daglig påminnelse. Växelkursen ({ds.settings.yenPerSek} yen per krona) ändras under Mer → Inställningar.</p>
      </Card>
    </Section>
  );
}
