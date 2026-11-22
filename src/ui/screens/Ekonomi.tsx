import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileText, Inbox, Plus, Printer, Trash2 } from 'lucide-react';
import { useData } from '../../data/store';
import { approveDraft, deleteVoucher, fillSaleDates, rejectDraft, saveManualVoucher, setOk } from '../../data/actions';
import { monthName, prevMonth, todayISO } from '../../domain/dates';
import { healthScore, runChecks, type IssueGroup } from '../../domain/checks';
import { ACCOUNTS, accountName, EVENT_TYPES, isBalanced, saleAmount, trialBalance, voucherBalance } from '../../domain/ledger';
import { quarterLabel, quarterOf, quarterReport, type Group, type Quarter } from '../../domain/quarter';
import { allLanded, brandStats, dropStats, isSold, live, periodPL } from '../../domain/metrics';
import { kr, parseOre } from '../../domain/money';
import { backupJson, encodeCp437, itemsCsv, ledgerCsv, sie4, sourceLabel, sortedVouchers, vouchersCsv } from '../../domain/export';
import type { Dataset, EventType, InboxDraft, Voucher, VoucherLine } from '../../domain/types';
import { go } from '../router';
import type { Route } from '../router';
import { Bars, Card, Chips, Columns, ConfirmButton, Empty, Field, MoneyInput, Page, Pill, Row, Section, Segmented, Stat, TopBand, cx } from '../components/ui';
import { Attachments } from './Attachments';
import { OkChip } from './Lager';
import { openQuick } from '../App';
import { toast } from '../Boot';

const VIEWS = [
  { value: 'oversikt', label: 'Översikt' },
  { value: 'verifikat', label: 'Verifikat' },
  { value: 'rapporter', label: 'Rapporter' },
  { value: 'analys', label: 'Analys' },
  { value: 'kvartal', label: 'Kvartal' },
  { value: 'kontroll', label: 'Kontroll' },
] as const;

export function Ekonomi({ route }: { route: Route }) {
  const [, sub, id] = route.path;
  if (sub === 'verifikat' && id) return <VoucherView id={id} />;
  if (sub === 'nytt') return <ManualVoucher />;
  if (sub === 'ko') return <Queue />;
  if (sub === 'export') return <Export />;
  const view = (VIEWS.find((v) => v.value === sub)?.value ?? (sub === 'huvudbok' ? 'rapporter' : 'oversikt')) as (typeof VIEWS)[number]['value'];
  return (
    <>
      <TopBand title="Ekonomi" sub="Bokföring, analys och kontroll">
        <div className="-mx-1 overflow-x-auto px-1">
          <div className="flex min-w-max gap-1 rounded-xl bg-white/10 p-1">
            {VIEWS.map((v) => (
              <a key={v.value} href={`#/ekonomi/${v.value}`} className={cx('min-h-[36px] rounded-lg px-3 py-2 text-[13px] font-semibold', view === v.value ? 'bg-on-forest text-forest' : 'text-on-forest-muted')}>
                {v.label}
              </a>
            ))}
          </div>
        </div>
      </TopBand>
      <Page>
        {view === 'oversikt' && <Overview />}
        {view === 'verifikat' && <Vouchers />}
        {view === 'rapporter' && <Reports />}
        {view === 'analys' && <Analysis />}
        {view === 'kvartal' && <QuarterView />}
        {view === 'kontroll' && <Checks />}
      </Page>
    </>
  );
}

// ---------- Översikt ----------

function Overview() {
  const ds = useData();
  const m = todayISO().slice(0, 7);
  const pl = periodPL(ds.vouchers, m);
  const pending = live(ds.inbox).filter((d) => d.status === 'väntar');
  const recent = sortedVouchers(ds.vouchers).slice(-6).reverse();
  const bal = trialBalance(ds.vouchers).find((b) => b.account === 1930)?.balance ?? 0;
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label={`Intäkter ${monthName(m, false)}`} value={kr(pl.revenue)} />
        <Stat label="Kostnader" value={kr(pl.costs)} />
        <Stat label="Resultat" value={<span className={pl.result < 0 ? 'text-neg' : ''}>{kr(pl.result)}</span>} />
        <Stat label="Företagskontot (1930)" value={kr(bal)} sub="enligt bokföringen" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-primary" onClick={() => openQuick('cost')}>
          <Plus size={18} aria-hidden /> Händelse
        </button>
        <a className="btn btn-ghost" href="#/ekonomi/nytt">
          Eget verifikat
        </a>
      </div>
      <Card pad={false}>
        <Row href="#/ekonomi/ko" chevron>
          <Inbox size={18} className="text-muted" aria-hidden />
          <span className="flex-1">Godkännandekö</span>
          {pending.length > 0 && <Pill tone="sun">{pending.length} väntar</Pill>}
        </Row>
        <Row href="#/ekonomi/export" chevron>
          <Download size={18} className="text-muted" aria-hidden />
          <span className="flex-1">Exportera (CSV, PDF, SIE, backup)</span>
        </Row>
      </Card>
      <Section title="Senast bokfört" action={<a href="#/ekonomi/verifikat">Alla</a>}>
        <Card pad={false}>{recent.length ? recent.map((v) => <VoucherRow key={v.id} v={v} />) : <p className="m-0 p-4 text-muted">Inget bokfört än.</p>}</Card>
      </Section>
      <p className="m-0 px-1 text-[12px] text-muted">Bokföringen i Jarvis är ett stöd för eget bruk. Låt någon redovisningskunnig granska den innan den används för deklaration.</p>
    </>
  );
}

function VoucherRow({ v }: { v: Voucher }) {
  const amt = saleAmount(v) || v.lines.reduce((s, l) => s + l.debit, 0);
  const inc = saleAmount(v) > 0;
  return (
    <a href={`#/ekonomi/verifikat/${v.id}`} className="flex min-h-[52px] items-center gap-3 border-b border-line-2 px-4 py-2 last:border-0 active:bg-surface-2">
      <span className="num w-10 shrink-0 text-[12px] text-muted">V{v.nr}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px]">{v.text}</span>
        <span className="block text-[12px] text-muted">
          {v.date} · {sourceLabel(v)}
        </span>
      </span>
      {!isBalanced(v.lines) && <AlertTriangle size={16} className="text-hi" aria-label="Balanserar inte" />}
      <span className={cx('num shrink-0 text-[14px]', inc && 'text-pos')}>
        {inc ? '+' : ''}
        {kr(amt)}
      </span>
    </a>
  );
}

// ---------- Verifikationer ----------

function Vouchers() {
  const ds = useData();
  const [q, setQ] = useState('');
  const [src, setSrc] = useState('alla');
  const all = sortedVouchers(ds.vouchers).reverse();
  const list = all.filter((v) => (src === 'alla' || (src === 'auto' ? v.source === 'auto' : src === 'egna' ? v.source !== 'auto' : true)) && (!q || `${v.nr} ${v.text} ${v.date}`.toLowerCase().includes(q.toLowerCase())));
  const groups = new Map<string, Voucher[]>();
  for (const v of list) groups.set(v.date.slice(0, 7), [...(groups.get(v.date.slice(0, 7)) ?? []), v]);
  return (
    <>
      <input className="field" placeholder="Sök verifikat (nummer, text, datum)…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Sök verifikat" />
      <Chips
        value={src}
        onChange={setSrc}
        options={[
          { value: 'alla', label: 'Alla', count: all.length },
          { value: 'auto', label: 'Automatiska' },
          { value: 'egna', label: 'Egna och händelser' },
        ]}
      />
      {[...groups].map(([m, vs], i) => {
        const pl = periodPL(vs, m);
        return (
          <details key={m} open={i < 2} className="card overflow-hidden">
            <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3">
              <b className="first-letter:uppercase">{monthName(m)}</b>
              <span className="num text-[12px] text-muted">
                {vs.length} st · +{kr(pl.revenue)} · −{kr(pl.costs)}
              </span>
            </summary>
            <div className="border-t border-line-2">
              {vs.map((v) => (
                <VoucherRow key={v.id} v={v} />
              ))}
            </div>
          </details>
        );
      })}
      {!list.length && <Empty title="Inga verifikat" text="Bokför en händelse eller registrera en försäljning." />}
    </>
  );
}

function VoucherView({ id }: { id: string }) {
  const ds = useData();
  const v = ds.vouchers.find((x) => x.id === id && !x.deletedAt);
  if (!v)
    return (
      <>
        <TopBand title="Verifikat" back="#/ekonomi/verifikat" />
        <Page>
          <Empty title="Verifikatet finns inte längre" />
        </Page>
      </>
    );
  const item = v.itemId ? ds.items.find((i) => i.id === v.itemId) : null;
  const drop = v.dropId ? ds.drops.find((d) => d.id === v.dropId) : null;
  const editable = v.source !== 'auto';
  return (
    <>
      <TopBand title={`V${v.nr}`} back="#/ekonomi/verifikat" sub={`${v.date} · ${sourceLabel(v)}`} right={<OkChip ok={v.ok} label={`V${v.nr}`} onChange={(o) => void setOk('vouchers', v.id, o)} />}>
        <div className="text-[15px]">{v.text}</div>
      </TopBand>
      <Page>
        {editable ? (
          <VoucherEditor initial={v} />
        ) : (
          <Card pad={false}>
            <LinesTable lines={v.lines} />
          </Card>
        )}
        {v.source === 'auto' && (
          <Card className="text-[14px]">
            Det här verifikatet skapas och uppdateras automatiskt från {item ? 'plagget' : 'dropen'}. Ändra {item ? 'priset eller datumet på plagget' : 'dropen'} så följer det med.
            <div className="mt-2">
              {item && (
                <a className="btn btn-soft" href={`#/lager/plagg/${item.id}`}>
                  Öppna {item.name}
                </a>
              )}
              {!item && drop && (
                <a className="btn btn-soft" href={`#/lager/drop/${drop.id}`}>
                  Öppna {drop.name}
                </a>
              )}
            </div>
          </Card>
        )}
        {editable && (item || drop) && <Card className="text-[14px]">Kopplat till {item ? `plagget ${item.name}` : `dropen ${drop!.name}`}.</Card>}
        <Attachments voucherId={v.id} />
        {editable && <ConfirmButton label={<><Trash2 size={16} aria-hidden /> Ta bort verifikat</>} onConfirm={() => void deleteVoucher(v.id).then(() => (go('#/ekonomi/verifikat')))} />}
      </Page>
    </>
  );
}

function LinesTable({ lines }: { lines: VoucherLine[] }) {
  const d = lines.reduce((s, l) => s + l.debit, 0);
  const c = lines.reduce((s, l) => s + l.credit, 0);
  return (
    <table className="w-full text-[14px]">
      <thead>
        <tr className="text-left text-[12px] text-muted">
          <th className="px-4 py-2 font-medium">Konto</th>
          <th className="px-2 py-2 text-right font-medium">Debet</th>
          <th className="px-4 py-2 text-right font-medium">Kredit</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={i} className="border-t border-line-2">
            <td className="px-4 py-2">
              <span className="num">{l.account}</span> <span className="text-muted">{accountName(l.account)}</span>
            </td>
            <td className="num px-2 py-2 text-right">{l.debit ? kr(l.debit, { decimals: true, unit: false }) : ''}</td>
            <td className="num px-4 py-2 text-right">{l.credit ? kr(l.credit, { decimals: true, unit: false }) : ''}</td>
          </tr>
        ))}
        <tr className="border-t border-line font-semibold">
          <td className="px-4 py-2">Summa {d === c ? <CheckCircle2 size={14} className="inline text-pos" aria-label="balanserar" /> : <span className="text-neg">(differens {kr(d - c, { decimals: true })})</span>}</td>
          <td className="num px-2 py-2 text-right">{kr(d, { decimals: true, unit: false })}</td>
          <td className="num px-4 py-2 text-right">{kr(c, { decimals: true, unit: false })}</td>
        </tr>
      </tbody>
    </table>
  );
}

function ManualVoucher() {
  return (
    <>
      <TopBand title="Eget verifikat" back="#/ekonomi" sub="För poster som inte passar en händelse" />
      <Page>
        <VoucherEditor />
      </Page>
    </>
  );
}

function VoucherEditor({ initial }: { initial?: Voucher }) {
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [text, setText] = useState(initial?.text ?? '');
  const [lines, setLines] = useState<VoucherLine[]>(initial?.lines ?? [{ account: 5460, debit: 0, credit: 0 }, { account: 1930, debit: 0, credit: 0 }]);
  const diff = voucherBalance(lines);
  const setLine = (i: number, p: Partial<VoucherLine>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));
  const dirty = !initial || date !== initial.date || text !== initial.text || JSON.stringify(lines) !== JSON.stringify(initial.lines);
  const save = async () => {
    const clean = lines.filter((l) => l.debit || l.credit);
    if (await saveManualVoucher({ date, text: text || 'Manuell post', lines: clean }, initial?.id)) {
      if (!initial) go('#/ekonomi/verifikat');
    }
  };
  return (
    <Card className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Datum">
          <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Text">
          <input className="field" value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
      </div>
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_96px_96px_36px] items-end gap-1.5">
          <Field label={i === 0 ? 'Konto' : ' '}>
            <select className="field px-2" value={l.account} onChange={(e) => setLine(i, { account: +e.target.value })}>
              {Object.entries(ACCOUNTS).map(([a, n]) => (
                <option key={a} value={a}>
                  {a} {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label={i === 0 ? 'Debet' : ' '}>
            <input className="field num px-2" inputMode="decimal" defaultValue={l.debit ? String(l.debit / 100).replace('.', ',') : ''} onBlur={(e) => setLine(i, { debit: parseOre(e.target.value) })} />
          </Field>
          <Field label={i === 0 ? 'Kredit' : ' '}>
            <input className="field num px-2" inputMode="decimal" defaultValue={l.credit ? String(l.credit / 100).replace('.', ',') : ''} onBlur={(e) => setLine(i, { credit: parseOre(e.target.value) })} />
          </Field>
          <button type="button" aria-label="Ta bort rad" className="grid h-11 place-items-center text-muted" onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))}>
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button type="button" className="btn btn-ghost h-10 min-h-0 text-[14px]" onClick={() => setLines((ls) => [...ls, { account: 1930, debit: 0, credit: 0 }])}>
          + Rad
        </button>
        <span className={cx('text-[14px] font-semibold', diff === 0 ? 'text-pos' : 'text-neg')}>{diff === 0 ? 'Balanserar' : `Debet − kredit = ${kr(diff, { decimals: true })}`}</span>
      </div>
      <p className="m-0 text-[12px] text-muted">Tillgångar och kostnader ökar på debet, intäkter, skulder och eget kapital på kredit. Debet måste vara lika med kredit.</p>
      <button className="btn btn-primary" disabled={diff !== 0 || !dirty || !lines.some((l) => l.debit || l.credit)} onClick={save}>
        {initial ? 'Spara ändringar' : 'Bokför'}
      </button>
    </Card>
  );
}

// ---------- Rapporter ----------

function Reports() {
  const ds = useData();
  const years = [...new Set(live(ds.vouchers).map((v) => v.date.slice(0, 4)))].sort().reverse();
  const [year, setYear] = useState(years[0] ?? todayISO().slice(0, 4));
  const [rep, setRep] = useState<'res' | 'hb' | 'moms'>('res');
  const pl = periodPL(ds.vouchers, year);
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  const tb = trialBalance(ds.vouchers, (v) => v.date.startsWith(year));
  return (
    <>
      <div className="flex items-center gap-2">
        <select className="field w-28" value={year} onChange={(e) => setYear(e.target.value)} aria-label="År">
          {(years.length ? years : [year]).map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <div className="flex-1">
          <Segmented
            value={rep}
            onChange={setRep}
            options={[
              { value: 'res', label: 'Resultat' },
              { value: 'hb', label: 'Huvudbok' },
              ...(ds.settings.vatEnabled ? [{ value: 'moms' as const, label: 'Moms' }] : []),
            ]}
          />
        </div>
        {import.meta.env.MODE !== 'preview' && (
          <button className="btn btn-ghost w-11 px-0" onClick={() => window.print()} aria-label="Skriv ut eller spara som PDF">
            <Printer size={18} aria-hidden />
          </button>
        )}
      </div>
      {rep === 'res' && (
        <>
          <Card>
            <div className="mb-3 font-semibold">Resultaträkning {year}</div>
            <table className="w-full text-[14px]">
              <tbody>
                {Object.entries(pl.byAccount)
                  .sort(([a], [b]) => +a - +b)
                  .map(([a, n]) => (
                    <tr key={a} className="border-t border-line-2">
                      <td className="py-1.5">
                        <span className="num">{a}</span> <span className="text-muted">{accountName(+a)}</span>
                      </td>
                      <td className="num py-1.5 text-right">{+a < 4000 ? '' : '−'}{kr(n, { decimals: true, unit: false })}</td>
                    </tr>
                  ))}
                <tr className="border-t border-line font-semibold">
                  <td className="py-2">Resultat</td>
                  <td className={cx('num py-2 text-right', pl.result < 0 && 'text-neg')}>{kr(pl.result, { decimals: true })}</td>
                </tr>
              </tbody>
            </table>
          </Card>
          <Card>
            <div className="mb-2 font-semibold">Resultat per månad</div>
            <Columns rows={months.map((m) => ({ label: m.slice(5), value: periodPL(ds.vouchers, m).result }))} />
          </Card>
          <Card pad={false}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  <th className="px-3 py-2 font-medium">Månad</th>
                  <th className="px-2 py-2 text-right font-medium">Intäkter</th>
                  <th className="px-2 py-2 text-right font-medium">Kostnader</th>
                  <th className="px-3 py-2 text-right font-medium">Resultat</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => {
                  const p = periodPL(ds.vouchers, m);
                  if (!p.revenue && !p.costs) return null;
                  return (
                    <tr key={m} className="border-t border-line-2">
                      <td className="px-3 py-2 capitalize">{monthName(m, false)}</td>
                      <td className="num px-2 py-2 text-right">{kr(p.revenue, { unit: false })}</td>
                      <td className="num px-2 py-2 text-right">{kr(p.costs, { unit: false })}</td>
                      <td className={cx('num px-3 py-2 text-right', p.result < 0 && 'text-neg')}>{kr(p.result, { unit: false })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
      {rep === 'hb' && (
        <Card pad={false} className="overflow-x-auto">
          <table className="w-full min-w-[440px] text-[13px]">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                <th className="px-3 py-2 font-medium">Konto</th>
                <th className="px-2 py-2 text-right font-medium">Debet</th>
                <th className="px-2 py-2 text-right font-medium">Kredit</th>
                <th className="px-3 py-2 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {tb.map((b) => (
                <tr key={b.account} className="border-t border-line-2">
                  <td className="px-3 py-2">
                    <span className="num">{b.account}</span> <span className="text-muted">{b.name}</span>
                  </td>
                  <td className="num px-2 py-2 text-right">{kr(b.debit, { unit: false })}</td>
                  <td className="num px-2 py-2 text-right">{kr(b.credit, { unit: false })}</td>
                  <td className="num px-3 py-2 text-right">{kr(b.balance, { unit: false })}</td>
                </tr>
              ))}
              <tr className="border-t border-line font-semibold">
                <td className="px-3 py-2">Summa</td>
                <td className="num px-2 py-2 text-right">{kr(tb.reduce((s, b) => s + b.debit, 0), { unit: false })}</td>
                <td className="num px-2 py-2 text-right">{kr(tb.reduce((s, b) => s + b.credit, 0), { unit: false })}</td>
                <td className={cx('px-3 py-2 text-right', tb.reduce((s, b) => s + b.balance, 0) === 0 ? 'text-pos' : 'text-neg')}>{tb.reduce((s, b) => s + b.balance, 0) === 0 ? 'Stämmer' : 'Differens'}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}
      {rep === 'moms' && (
        <Card>
          <div className="mb-2 font-semibold">Moms {year}</div>
          {months.map((m) => {
            const p = periodPL(ds.vouchers, m);
            return p.vat ? (
              <div key={m} className="flex justify-between border-t border-line-2 py-1.5 text-[14px]">
                <span className="capitalize">{monthName(m, false)}</span>
                <span className="num">{kr(p.vat, { decimals: true })}</span>
              </div>
            ) : null;
          })}
          <div className="flex justify-between border-t border-line py-2 font-semibold">
            <span>Att betala (+) eller få tillbaka (−)</span>
            <span className="num">{kr(pl.vat, { decimals: true })}</span>
          </div>
          <p className="m-0 text-[12px] text-muted">Begagnade varor kan omfattas av vinstmarginalbeskattning. Stäm av med Skatteverket eller en redovisningskunnig.</p>
        </Card>
      )}
    </>
  );
}

// ---------- Analys ----------

function Analysis() {
  const ds = useData();
  const [mode, setMode] = useState<'m' | 'y' | 'd'>('m');
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [dropId, setDropId] = useState('');
  const L = useMemo(() => allLanded(ds), [ds]);
  const drops = live(ds.drops).sort((a, b) => (a.date < b.date ? 1 : -1));
  const period = mode === 'y' ? month.slice(0, 4) : month;
  if (mode === 'd') {
    const d = drops.find((x) => x.id === dropId) ?? drops[0];
    if (!d) return <Empty title="Inga drops" />;
    const s = dropStats(ds, d);
    const items = L.filter((l) => l.drop.id === d.id);
    const cat = new Map<string, { n: number; s: number; r: number; p: number }>();
    for (const l of items) {
      const c = cat.get(l.item.category) ?? { n: 0, s: 0, r: 0, p: 0 };
      c.n++;
      if (isSold(l.item)) {
        c.s++;
        c.r += l.item.salePrice;
        c.p += l.profit ?? 0;
      }
      cat.set(l.item.category, c);
    }
    return (
      <>
        <Segmented value={mode} onChange={setMode} options={[{ value: 'm', label: 'Månad' }, { value: 'y', label: 'År' }, { value: 'd', label: 'Drop' }]} />
        <select className="field" value={d.id} onChange={(e) => setDropId(e.target.value)} aria-label="Välj drop">
          {drops.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} · {x.date.slice(0, 7)}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label="Total kostnad" value={kr(s.cost)} />
          <Stat label="Intäkt" value={kr(s.revenue)} />
          <Stat label="Resultat" value={<span className={s.result < 0 ? 'text-neg' : 'text-pos'}>{kr(s.result)}</span>} />
          <Stat label="ROI" value={`${Math.round(s.roi)} %`} />
          <Stat label="Snittpris sålda" value={s.avgSale ? kr(s.avgSale) : '–'} />
          <Stat label="Break-even" value={s.breakEven ? `${s.breakEven} sålda` : '–'} sub={`${s.sold} sålda hittills`} tone={s.breakEven && s.sold >= s.breakEven ? 'pos' : undefined} />
          <Stat label="Osålda" value={`${s.count - s.sold} st`} sub={`${kr(s.unsoldCost)} kvar att tjäna in`} />
          <Stat label="Andel sålda" value={`${s.count ? Math.round((s.sold / s.count) * 100) : 0} %`} />
        </div>
        <Section title="Vinst per kategori">
          <Card>
            <Bars rows={[...cat].map(([k, c]) => ({ label: k, value: c.p, sub: `${c.s}/${c.n} sålda · ${kr(c.p)}` }))} />
          </Card>
        </Section>
        <Section title="Bästa plagg">
          <Card>
            <Bars rows={items.filter((l) => l.profit != null).sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0)).slice(0, 5).map((l) => ({ label: l.item.name, value: l.profit ?? 0, sub: kr(l.profit ?? 0) }))} />
          </Card>
        </Section>
        <Section title="ROI per drop">
          <Card>
            <Bars rows={drops.slice().reverse().map((x) => { const y = dropStats(ds, x); return { label: x.name, value: y.roi, sub: `${Math.round(y.roi)} % · ${kr(y.result)}` }; })} />
          </Card>
        </Section>
      </>
    );
  }
  const pl = periodPL(ds.vouchers, period);
  const sold = L.filter((l) => isSold(l.item) && (l.item.saleDate ?? '').startsWith(period));
  const bought = L.filter((l) => l.drop.date.startsWith(period));
  const gm = pl.revenue ? ((pl.revenue - (pl.byAccount[4010] ?? 0)) / pl.revenue) * 100 : 0;
  const cats = new Map<string, { n: number; r: number; p: number }>();
  for (const l of sold) {
    const c = cats.get(l.item.category) ?? { n: 0, r: 0, p: 0 };
    c.n++;
    c.r += l.item.salePrice;
    c.p += l.profit ?? 0;
    cats.set(l.item.category, c);
  }
  const costs = Object.entries(pl.byAccount).filter(([a, n]) => +a >= 4000 && n > 0);
  const trend =
    mode === 'y'
      ? Array.from({ length: 12 }, (_, i) => `${period}-${String(i + 1).padStart(2, '0')}`)
      : Array.from({ length: 6 }, (_, i) => {
          let m = month;
          for (let k = 0; k < 5 - i; k++) m = prevMonth(m);
          return m;
        });
  return (
    <>
      <Segmented value={mode} onChange={setMode} options={[{ value: 'm', label: 'Månad' }, { value: 'y', label: 'År' }, { value: 'd', label: 'Drop' }]} />
      {mode === 'm' ? (
        <input type="month" className="field" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Månad" />
      ) : (
        <input type="number" className="field" value={month.slice(0, 4)} onChange={(e) => e.target.value && setMonth(`${e.target.value}-${month.slice(5)}`)} aria-label="År" />
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Intäkter" value={kr(pl.revenue)} />
        <Stat label="Kostnader" value={kr(pl.costs)} />
        <Stat label="Resultat" value={<span className={pl.result < 0 ? 'text-neg' : 'text-pos'}>{kr(pl.result)}</span>} />
        <Stat label="Nettomarginal" value={pl.revenue ? `${Math.round((pl.result / pl.revenue) * 100)} %` : '–'} />
        <Stat label="Bruttomarginal" value={pl.revenue ? `${Math.round(gm)} %` : '–'} sub="intäkt minus inköp" />
        <Stat label="Sålda av periodens inköp" value={bought.length ? `${Math.round((bought.filter((l) => isSold(l.item)).length / bought.length) * 100)} %` : '–'} />
      </div>
      <Section title={mode === 'y' ? 'Resultat per månad' : 'Trend, 6 månader'}>
        <Card>
          <Columns rows={trend.map((m) => ({ label: m.slice(5), value: periodPL(ds.vouchers, m).result }))} />
        </Card>
      </Section>
      <Section title="Kostnadsfördelning">
        <Card>
          <Bars rows={costs.map(([a, n], i) => ({ label: accountName(+a), value: n, sub: kr(n), color: ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)'][i % 5] }))} />
        </Card>
      </Section>
      <Section title="Försäljning per kategori">
        <Card>
          <Bars rows={[...cats].sort((a, b) => b[1].r - a[1].r).map(([k, c]) => ({ label: k, value: c.r, sub: `${c.n} st · ${kr(c.r)} · vinst ${kr(c.p)}` }))} />
        </Card>
      </Section>
      <BrandTable period={period} />
      <Section title="Bästa plagg i perioden">
        <Card>
          <Bars rows={sold.sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0)).slice(0, 5).map((l) => ({ label: l.item.name, value: l.profit ?? 0, sub: kr(l.profit ?? 0) }))} />
        </Card>
      </Section>
    </>
  );
}

// ---------- Kontroll ----------

function Checks() {
  const ds = useData();
  const today = todayISO();
  const groups = useMemo(() => runChecks(ds, today), [ds, today]);
  const score = healthScore(groups);
  const L = allLanded(ds);
  return (
    <>
      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Hälsopoäng" value={<span className={score >= 85 ? 'text-pos' : score >= 60 ? 'text-me' : 'text-neg'}>{score}</span>} />
        <Stat label="Att titta på" value={groups.reduce((s, g) => s + g.refs.length, 0)} />
        <Stat label="Kontrollerade" value={`${L.filter((l) => l.item.ok === 1).length} ✓`} sub={`${L.filter((l) => l.item.ok === 2).length} fel`} />
      </div>
      {groups.map((g, i) => (
        <IssueCard key={g.id} g={g} open={i < 2} ds={ds} />
      ))}
      {!groups.length && <Empty title="Allt ser bra ut" text="Inga fel hittades i dina siffror." />}
      <a className="btn btn-ghost" href="#/ekonomi/export">
        <Download size={16} aria-hidden /> Exportera till CSV
      </a>
    </>
  );
}

function IssueCard({ g, open, ds }: { g: IssueGroup; open: boolean; ds: Dataset }) {
  const [n, setN] = useState(12);
  const tone = g.severity === 3 ? 'hi' : g.severity === 2 ? 'me' : 'neutral';
  const href = (r: IssueGroup['refs'][number]) => (r.kind === 'item' ? `#/lager/plagg/${r.id}` : r.kind === 'drop' ? `#/lager/drop/${r.id}` : `#/ekonomi/verifikat/${r.id}`);
  void ds;
  return (
    <details open={open} className="card overflow-hidden">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3">
        <Pill tone={tone}>{g.severity === 3 ? 'Allvarligt' : g.severity === 2 ? 'Viktigt' : 'Se över'}</Pill>
        <b className="flex-1 text-[15px]">{g.title}</b>
        <span className="num text-[13px] text-muted">{g.refs.length}</span>
      </summary>
      <div className="border-t border-line-2">
        <p className="m-0 px-4 py-2 text-[13px] text-muted">{g.hint}</p>
        {g.refs.slice(0, n).map((r) => (
          <div key={r.id} className="flex min-h-[48px] items-center gap-2 border-t border-line-2 px-4 py-2">
            <a href={href(r)} className="min-w-0 flex-1 truncate text-[14px]">
              {r.label}
            </a>
            {r.action === 'removeDuplicate' && (
              <ConfirmButton className="h-9 min-h-0 px-3 text-[13px]" label="Ta bort dubblett" confirmLabel="Säker?" onConfirm={() => void deleteVoucher(r.id, 'Dubblett borttagen')} />
            )}
          </div>
        ))}
        {g.refs.length > n && (
          <button className="w-full border-t border-line-2 py-3 text-[13px] font-semibold text-accent" onClick={() => setN(n + 50)}>
            Visa fler ({g.refs.length - n})
          </button>
        )}
        {g.autoFix === 'fillSaleDates' && (
          <div className="border-t border-line-2 p-3">
            <button className="btn btn-soft w-full" onClick={() => void fillSaleDates()}>
              Fyll i med dropens datum
            </button>
          </div>
        )}
      </div>
    </details>
  );
}

// ---------- Godkännandekö ----------

function Queue() {
  const ds = useData();
  const pending = live(ds.inbox).filter((d) => d.status === 'väntar');
  const done = live(ds.inbox).filter((d) => d.status !== 'väntar').slice(-10).reverse();
  return (
    <>
      <TopBand title="Godkännandekö" back="#/ekonomi" sub="Utkast från mejl och import. Inget bokförs utan ditt godkännande." />
      <Page>
        <button className="btn btn-soft" onClick={() => openQuick('mail')}>
          <FileText size={16} aria-hidden /> Klistra in mejl
        </button>
        {pending.map((d) => (
          <DraftCard key={d.id} d={d} ds={ds} />
        ))}
        {!pending.length && <Empty title="Kön är tom" text="Klistra in ett mejl från Vinted, Plick eller Doorzo så hamnar ett förslag här." />}
        {done.length > 0 && (
          <Section title="Senast hanterade">
            <Card pad={false}>
              {done.map((d) => (
                <div key={d.id} className="flex justify-between gap-2 border-b border-line-2 px-4 py-2.5 text-[14px] last:border-0">
                  <span className="truncate">{d.title}</span>
                  <Pill tone={d.status === 'godkänd' ? 'lo' : 'neutral'}>{d.status}</Pill>
                </div>
              ))}
            </Card>
          </Section>
        )}
      </Page>
    </>
  );
}

function DraftCard({ d, ds }: { d: InboxDraft; ds: Dataset }) {
  const [type, setType] = useState<EventType>(d.eventType);
  const [amount, setAmount] = useState(d.amount);
  const [date, setDate] = useState(d.date);
  const [itemId, setItemId] = useState(d.itemId ?? '');
  const [dropId, setDropId] = useState(d.dropId ?? '');
  const unsold = allLanded(ds).filter((l) => !isSold(l.item));
  const guess = d.rawText ? unsold.filter((l) => d.rawText.toLowerCase().includes(l.item.name.toLowerCase())).slice(0, 3) : [];
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{d.title}</div>
          <div className="text-[12px] text-muted">
            Från {d.source} · {d.confidence >= 0.7 ? 'säker tolkning' : d.confidence >= 0.4 ? 'kontrollera gärna' : 'osäker tolkning'}
          </div>
        </div>
        <Pill tone={d.confidence >= 0.7 ? 'lo' : 'me'}>{EVENT_TYPES[type].label}</Pill>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Typ">
          <select className="field" value={type} onChange={(e) => setType(e.target.value as EventType)}>
            {Object.entries(EVENT_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Belopp">
          <MoneyInput value={amount} onCommit={setAmount} />
        </Field>
        <Field label="Datum">
          <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {type === 'sale' ? (
          <Field label="Plagg som såldes">
            <select className="field" value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">Inget (bokför bara)</option>
              {guess.map((l) => (
                <option key={`g${l.item.id}`} value={l.item.id}>
                  ★ {l.item.name}
                </option>
              ))}
              {unsold.map((l) => (
                <option key={l.item.id} value={l.item.id}>
                  {l.item.name} · {l.drop.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Drop">
            <select className="field" value={dropId} onChange={(e) => setDropId(e.target.value)}>
              <option value="">Ingen</option>
              {live(ds.drops).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {d.rawText && (
        <details>
          <summary className="cursor-pointer text-[13px] text-muted">Visa mejltexten</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-2 text-[12px]">{d.rawText}</pre>
        </details>
      )}
      <div className="flex gap-2">
        <button className="btn btn-ghost flex-1" onClick={() => void rejectDraft(d.id)}>
          Avvisa
        </button>
        <button
          className="btn btn-primary flex-1"
          disabled={!amount}
          onClick={() => void approveDraft(d.id, { eventType: type, amount, date, itemId: itemId || null, dropId: dropId || null }).then((ok) => ok && toast('Bokfört'))}
        >
          Godkänn
        </button>
      </div>
    </Card>
  );
}

// ---------- Export ----------

function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast(`${name} sparad`);
}

function Export() {
  const ds = useData();
  const t = todayISO();
  const years = [...new Set(live(ds.vouchers).map((v) => v.date.slice(0, 4)))].sort().reverse();
  const [year, setYear] = useState(years[0] ?? t.slice(0, 4));
  return (
    <>
      <TopBand title="Exportera" back="#/ekonomi" sub="Till Excel, revisorn eller som säkerhetskopia" />
      <Page>
        <select className="field" value={year} onChange={(e) => setYear(e.target.value)} aria-label="År">
          {(years.length ? years : [year]).map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <Card pad={false}>
          <Row onClick={() => download(`jarvis-plagg-${t}.csv`, itemsCsv(ds), 'text/csv;charset=utf-8')}>
            <span className="flex-1">
              <b className="block">Plagg (CSV)</b>
              <span className="text-[13px] text-muted">Alla plagg med hemkostnad, försäljning och vinst</span>
            </span>
          </Row>
          <Row onClick={() => download(`jarvis-verifikat-${t}.csv`, vouchersCsv(ds), 'text/csv;charset=utf-8')}>
            <span className="flex-1">
              <b className="block">Verifikationslista (CSV)</b>
              <span className="text-[13px] text-muted">En rad per kontorad</span>
            </span>
          </Row>
          <Row onClick={() => download(`jarvis-huvudbok-${year}.csv`, ledgerCsv(ds, year), 'text/csv;charset=utf-8')}>
            <span className="flex-1">
              <b className="block">Huvudbok {year} (CSV)</b>
              <span className="text-[13px] text-muted">Saldo per konto</span>
            </span>
          </Row>
          <Row onClick={() => download(`jarvis-${year}.se`, encodeCp437(sie4(ds, year, t)), 'application/octet-stream')}>
            <span className="flex-1">
              <b className="block">SIE 4 för {year}</b>
              <span className="text-[13px] text-muted">Läses av alla svenska bokföringsprogram och byråer</span>
            </span>
          </Row>
          <Row onClick={() => (go('#/ekonomi/rapporter'))}>
            <span className="flex-1">
              <b className="block">PDF</b>
              <span className="text-[13px] text-muted">Öppna Rapporter och tryck på skrivarikonen, välj Spara som PDF</span>
            </span>
          </Row>
          <Row onClick={() => download(`jarvis-backup-${t}.json`, backupJson(ds), 'application/json')}>
            <span className="flex-1">
              <b className="block">Fullständig säkerhetskopia (JSON)</b>
              <span className="text-[13px] text-muted">All data, kan återställas under Mer</span>
            </span>
          </Row>
        </Card>
      </Page>
    </>
  );
}

function BrandTable({ period }: { period: string }) {
  const ds = useData();
  const [sort, setSort] = useState<'revenue' | 'profit' | 'margin'>('revenue');
  const rows = useMemo(() => brandStats(ds, period), [ds, period]).sort((a, b) => b[sort] - a[sort]);
  const max = Math.max(1, ...rows.map((r) => Math.abs(r[sort])));
  return (
    <Section title="Märken">
      <Segmented
        value={sort}
        onChange={setSort}
        options={[
          { value: 'revenue', label: 'Omsättning' },
          { value: 'profit', label: 'Vinst' },
          { value: 'margin', label: 'Marginal' },
        ]}
      />
      <Card pad={false} className="overflow-x-auto">
        {rows.length ? (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                <th className="px-3 py-2 font-medium">Märke</th>
                <th className="px-1 py-2 text-right font-medium">Oms.</th>
                <th className="px-1 py-2 text-right font-medium">Vinst</th>
                <th className="px-3 py-2 text-right font-medium">Marg.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.brand} className="border-t border-line-2">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.brand}</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line-2">
                      <i className="block h-full rounded-full" style={{ width: `${(Math.abs(r[sort]) / max) * 100}%`, background: r[sort] < 0 ? 'var(--neg)' : 'var(--accent)' }} />
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted">{r.sold} sålda · snitt {kr(r.avgPrice)}{r.unsold ? ` · ${r.unsold} osålda` : ''}</div>
                  </td>
                  <td className="num px-1 py-2 text-right">{kr(r.revenue, { unit: false })}</td>
                  <td className={cx('num px-1 py-2 text-right', r.profit < 0 && 'text-neg')}>{kr(r.profit, { unit: false })}</td>
                  <td className={cx('num px-3 py-2 text-right', r.margin < 0 ? 'text-neg' : r.margin >= 50 ? 'text-pos' : '')}>{Math.round(r.margin)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="m-0 p-4 text-[14px] text-muted">Ingen försäljning i perioden.</p>
        )}
      </Card>
      <p className="m-0 px-1 text-[12px] text-muted">Vinst = försäljningspris minus hemkostnad (inköp, frakt, tull, förpackning). Marginal = vinst delat med omsättning. Plagg utan märke räknas som Okänt märke.</p>
    </Section>
  );
}

function QuarterView() {
  const ds = useData();
  const now = quarterOf(todayISO());
  const first = useMemo(() => {
    const dates = ds.items.filter((i) => !i.deletedAt && i.saleDate).map((i) => i.saleDate!) as string[];
    return dates.length ? quarterOf(dates.reduce((a, b) => (a < b ? a : b))) : now;
  }, [ds]);
  const options: Quarter[] = [];
  for (let y = now.year, q = now.q; y > first.year || (y === first.year && q >= first.q); q === 1 ? ((q = 4 as Quarter['q']), y--) : (q = (q - 1) as Quarter['q'])) options.push({ year: y, q });
  const [sel, setSel] = useState(0);
  const r = useMemo(() => quarterReport(ds, options[sel] ?? now), [ds, sel]);
  const diff = (a: number, b: number) => (b ? `${a >= b ? '+' : '−'}${Math.abs(Math.round(((a - b) / Math.abs(b)) * 100))} % mot förra kvartalet` : undefined);
  return (
    <>
      <select className="field" value={sel} onChange={(e) => setSel(+e.target.value)} aria-label="Kvartal">
        {options.map((q, i) => (
          <option key={i} value={i}>
            {quarterLabel(q)}
            {i === 0 ? ' (pågår)' : ''}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Sålt" value={kr(r.soldRevenue)} sub={`${r.soldCount} plagg${r.prev.soldCount ? ` · förra: ${r.prev.soldCount}` : ''}`} />
        <Stat label="Vinst på sålda" value={<span className={r.soldProfit < 0 ? 'text-neg' : 'text-pos'}>{kr(r.soldProfit)}</span>} sub={`${Math.round(r.margin)} % marginal`} />
        <Stat label="Resultat (bokföring)" value={kr(r.result)} sub={diff(r.result, r.prev.result)} />
        <Stat label="Lager vid kvartalets slut" value={kr(r.stockValueEnd)} sub={`${r.unsoldEnd} plagg`} />
      </div>
      {(r.buyMore.length > 0 || r.buyLess.length > 0) && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Card>
            <div className="mb-1 font-semibold text-pos">Köp mer av</div>
            {r.buyMore.length ? r.buyMore.map((t) => <p key={t} className="m-0 text-[14px]">{t}</p>) : <p className="m-0 text-[14px] text-muted">Inget som sticker ut.</p>}
          </Card>
          <Card>
            <div className="mb-1 font-semibold text-me">Köp mindre av</div>
            {r.buyLess.length ? r.buyLess.map((t) => <p key={t} className="m-0 text-[14px]">{t}</p>) : <p className="m-0 text-[14px] text-muted">Inget som sticker ut.</p>}
          </Card>
        </div>
      )}
      {r.notes.length > 0 && (
        <Card className="flex flex-col gap-1">
          {r.notes.map((n) => (
            <p key={n} className="m-0 text-[14px]">
              {n}
            </p>
          ))}
        </Card>
      )}
      <GroupTable title="Märken" rows={r.brands} />
      <GroupTable title="Kategorier" rows={r.categories} />
      <GroupTable title="Storlekar" rows={r.sizes} />
      <GroupTable title="Inköpspris" rows={r.costBuckets} keepOrder />
      <p className="m-0 px-1 text-[12px] text-muted">Rekommendationerna bygger på minst tre sålda plagg per märke eller kategori, marginal jämfört med ditt snitt och hur stor andel som sålts. Jarvis sätter aldrig pris på enskilda plagg.</p>
    </>
  );
}

function GroupTable({ title, rows, keepOrder }: { title: string; rows: Group[]; keepOrder?: boolean }) {
  const list = (keepOrder ? rows : rows.slice(0, 10)).filter((g) => g.sold > 0 || g.bought > 0);
  if (!list.length) return null;
  return (
    <Section title={title}>
      <Card pad={false}>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[12px] text-muted">
              <th className="px-3 py-2 font-medium">{({ Märken: 'Märke', Kategorier: 'Kategori', Storlekar: 'Storlek', Inköpspris: 'Pris' } as Record<string, string>)[title] ?? title}</th>
              <th className="px-1 py-2 text-right font-medium">Sålda</th>
              <th className="px-1 py-2 text-right font-medium">Vinst</th>
              <th className="px-3 py-2 text-right font-medium">ROI</th>
            </tr>
          </thead>
          <tbody>
            {list.map((g) => (
              <tr key={g.key} className="border-t border-line-2">
                <td className="px-3 py-2">
                  <div className="font-medium">{g.key}</div>
                  <div className="text-[11px] text-muted">
                    {g.bought ? `${g.bought} köpta` : ''}
                    {g.bought && g.sellThrough !== null ? ' · ' : ''}
                    {g.sellThrough !== null ? `${Math.round(g.sellThrough * 100)} % sålda totalt` : ''}
                  </div>
                </td>
                <td className="num px-1 py-2 text-right">{g.sold}</td>
                <td className={cx('num px-1 py-2 text-right', g.profit < 0 && 'text-neg')}>{kr(g.profit, { unit: false })}</td>
                <td className={cx('num px-3 py-2 text-right', g.roi < 0 ? 'text-neg' : g.roi >= 100 ? 'text-pos' : '')}>{g.sold ? `${Math.round(g.roi)} %` : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Section>
  );
}
