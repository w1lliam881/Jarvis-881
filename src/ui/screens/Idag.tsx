import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useData, useStore } from '../../data/store';
import { addTask, addTasks, deleteTask, toggleTask } from '../../data/actions';
import { addDays, daysInMonth, longDate, monthName, nextMonth, prevMonth, todayISO, weekStart, weekdayShort } from '../../domain/dates';
import { healthScore, runChecks } from '../../domain/checks';
import { allLanded, dailySales, isSold, live, overview, periodPL, stockAge } from '../../domain/metrics';
import { kr } from '../../domain/money';
import { saleAmount } from '../../domain/ledger';
import { generateQuests, questBoard, xpInfo } from '../../game/engine';
import type { Dataset, Task } from '../../domain/types';
import { go } from '../router';
import type { Route } from '../router';
import { Bars, Card, Money, Page, Pill, RoiPill, Section, Segmented, Spark, Stat, TopBand, cx } from '../components/ui';
import { openQuick } from '../App';
import { Presence } from '../components/Presence';
import { toast } from '../Boot';

export function Idag({ route }: { route: Route }) {
  const ds = useData();
  const { status } = useStore();
  const today = todayISO();
  const view = route.query.get('v') === 'kalender' ? 'kalender' : 'oversikt';
  const o = useMemo(() => overview(ds, today), [ds, today]);
  const goal = live(ds.goals).find((g) => g.kind === 'monthRevenue');
  const daily = useMemo(() => dailySales(ds, o.month).slice(0, +today.slice(8, 10)), [ds, o.month, today]);

  return (
    <>
      <TopBand
        title="Idag"
        sub={longDate(today)}
        right={
          <div className="mt-1 flex flex-col items-end gap-2">
          <Presence />
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-mono text-[11px] text-mint lg:hidden">
            <i className={cx('h-1.5 w-1.5 rounded-full', status.state === 'saving' ? 'bg-sun' : 'bg-mint')} />
            {status.state === 'saving' ? 'Sparar' : status.at ? `Sparat ${new Date(status.at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}` : 'Synkad'}
          </span>
          </div>
        }
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[12px] text-on-forest-muted">Sålt i {monthName(o.month, false)}</div>
            <div className="tabnum mt-1 whitespace-nowrap font-serif text-[40px] font-medium leading-none">{kr(o.soldRevenue)}</div>
            <div className="mt-1.5 text-[13px] text-on-forest-muted">
              {o.soldCount} plagg · <b className="font-medium text-mint">{kr(o.soldProfit)}</b> i vinst
            </div>
          </div>
          <Spark values={daily} />
        </div>
        {goal ? (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-[12px] text-on-forest-muted">
              <span>{goal.name}</span>
              <b className="num font-medium text-on-forest">
                {Math.round(o.soldRevenue / 100).toLocaleString('sv-SE')} / {goal.target.toLocaleString('sv-SE')}
              </b>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <i className="block h-full rounded-full" style={{ width: `${Math.min(100, (o.soldRevenue / 100 / Math.max(1, goal.target)) * 100)}%`, background: 'linear-gradient(90deg,var(--mint),var(--sun))' }} />
            </div>
          </div>
        ) : (
          <a href="#/planering/framtid" className="mt-4 inline-block text-[13px] text-on-forest-muted underline">
            Sätt ett månadsmål
          </a>
        )}
        <div className="mt-4">
          <Segmented
            dark
            value={view}
            onChange={(v) => (go(v === 'kalender' ? '#/idag?v=kalender' : '#/idag'))}
            options={[
              { value: 'oversikt', label: 'Översikt' },
              { value: 'kalender', label: 'Kalender' },
            ]}
          />
        </div>
      </TopBand>
      <Page>{view === 'kalender' ? <Calendar ds={ds} /> : <Overview ds={ds} o={o} />}</Page>
    </>
  );
}

function Overview({ ds, o }: { ds: Dataset; o: ReturnType<typeof overview> }) {
  const today = todayISO();
  const checks = useMemo(() => runChecks(ds, today), [ds, today]);
  const score = healthScore(checks);
  const pl = periodPL(ds.vouchers, o.month);
  const cats = Object.entries(o.byCategoryUnsold).sort((a, b) => b[1] - a[1]);
  const colors = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)'];
  const age = useMemo(() => stockAge(ds, today), [ds, today]);
  const recent = useMemo(
    () =>
      allLanded(ds)
        .filter((l) => isSold(l.item))
        .sort((a, b) => ((b.item.saleDate ?? '') > (a.item.saleDate ?? '') ? 1 : -1))
        .slice(0, 5),
    [ds],
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
        <a href="#/lager" className="card p-3 lg:p-4">
          <span className="block text-[12px] text-muted">Lagervärde</span>
          <span className="num mt-0.5 block text-[18px] font-medium">{kr(o.stockValue)}</span>
          <div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
            {cats.map(([c, n], i) => (
              <i key={c} style={{ flex: n, background: colors[i % colors.length] }} />
            ))}
          </div>
          <span className="mt-1.5 block truncate text-[11px] text-muted">{cats.map(([c, n]) => `${c} ${n}`).join(' · ') || 'Tomt lager'}</span>
        </a>
        <a href="#/lager?f=old" className="card p-3 lg:p-4">
          <span className="block text-[12px] text-muted">Osålda plagg</span>
          <span className="num mt-0.5 block text-[18px] font-medium">{o.unsoldCount} st</span>
          <span className={cx('mt-1.5 block text-[12px]', o.old60Count ? 'text-me' : 'text-muted')}>{o.old60Count ? `${o.old60Count} ligger över 60 dagar` : 'Inget gammalt lager'}</span>
        </a>
        <a href="#/ekonomi/kontroll" className="card p-3 lg:p-4">
          <span className="block text-[12px] text-muted">Kontroll</span>
          <span className={cx('num mt-0.5 block text-[18px] font-medium', score >= 85 ? 'text-pos' : score >= 60 ? 'text-me' : 'text-neg')}>{score}/100</span>
          <span className="mt-1.5 block text-[12px] text-muted">{checks.reduce((s, g) => s + g.refs.length, 0)} saker att titta på</span>
        </a>
        <a href="#/ekonomi/rapporter" className="card p-3 lg:p-4">
          <span className="block text-[12px] text-muted">Resultat {monthName(o.month, false)}</span>
          <span className={cx('num mt-0.5 block text-[18px] font-medium', pl.result < 0 && 'text-neg')}>{kr(pl.result)}</span>
          <span className="mt-1.5 block text-[12px] text-muted">enligt bokföringen</span>
        </a>
      </div>

      <div className="desk-cols">
      <div className="desk-col">
      {ds.settings.gameEnabled && <QuestStrip ds={ds} />}

      <Tasks ds={ds} />
      </div>
      <div className="desk-col">

      <Section title="Senast sålt" action={<a href="#/salj">Visa alla</a>}>
        <Card pad={false}>
          {recent.length ? (
            recent.map((l) => (
              <a key={l.item.id} href={`#/lager/plagg/${l.item.id}`} className="flex min-h-[52px] items-center gap-3 border-b border-line-2 px-4 py-2 last:border-0 active:bg-surface-2">
                <span className="num w-11 shrink-0 text-[12px] text-muted">{l.item.saleDate ? `${+l.item.saleDate.slice(8)}/${+l.item.saleDate.slice(5, 7)}` : '–'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px]">{l.item.name}</span>
                  <span className="block truncate text-[12px] text-muted">{[l.item.productId, l.item.brand, l.item.platform].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <Money v={l.item.salePrice} className="text-[14px]" />
                  <RoiPill roi={l.landed ? ((l.profit ?? 0) / l.landed) * 100 : null} />
                </span>
              </a>
            ))
          ) : (
            <p className="m-0 p-4 text-[14px] text-muted">Ingen försäljning än. Tryck på Ny när något säljs.</p>
          )}
        </Card>
      </Section>

      <Section title="Lagerålder" action={<span className="text-muted">från dropens datum</span>}>
        <Card>
          <Bars rows={age.map((b, i) => ({ label: b.label, value: b.value, sub: `${b.count} st · ${kr(b.value)}`, color: i >= 2 ? 'var(--sun)' : undefined }))} />
        </Card>
      </Section>

      <Summary ds={ds} />
      </div>
      </div>
    </>
  );
}

function QuestStrip({ ds }: { ds: Dataset }) {
  const today = todayISO();
  const xp = xpInfo(ds, today);
  const board = questBoard(generateQuests(ds, today));
  if (!ds.settings.gameStartedAt) return null;
  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          Dagens uppdrag <Pill tone="sun">Lv {xp.level}</Pill>
        </span>
      }
      action={<a href="#/spelet">Spelet</a>}
    >
      <Card pad={false}>
        {board.today.length ? (
          board.today.map((q) => (
            <a key={q.id} href={q.route} className="flex min-h-[52px] items-center gap-3 border-b border-line-2 px-4 py-3 last:border-0 active:bg-surface-2">
              <Sparkles size={16} className="shrink-0 text-me" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px]">{q.title}</span>
                <span className="block text-[12px] text-muted">
                  {q.category} · ca {q.minutes} min · {q.benefit}
                </span>
              </span>
              <span className="num shrink-0 text-[12px] text-me">+{q.xp}</span>
            </a>
          ))
        ) : (
          <p className="m-0 p-4 text-[14px] text-muted">Inga uppdrag just nu.</p>
        )}
      </Card>
    </Section>
  );
}

function Tasks({ ds }: { ds: Dataset }) {
  const today = todayISO();
  const [text, setText] = useState('');
  const [bulk, setBulk] = useState('');
  const open = live(ds.tasks)
    .filter((t) => !t.done && t.date <= addDays(today, 7))
    .sort((a, b) => prioN(b) - prioN(a) || (a.date < b.date ? -1 : 1));
  const doneToday = live(ds.tasks).filter((t) => t.done && t.doneAt === today);
  const add = async () => {
    if (!text.trim()) return;
    if (await addTask(text.trim())) setText('');
  };
  return (
    <Section title="Att göra" action={<span className="text-muted">{open.length} kvar</span>}>
      <Card pad={false}>
        <div className="flex gap-2 border-b border-line-2 p-3">
          <input className="field" placeholder="Ny uppgift…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} aria-label="Ny uppgift" />
          <button type="button" className="btn btn-primary w-12 shrink-0 px-0" onClick={add} aria-label="Lägg till uppgift">
            <Plus size={20} aria-hidden />
          </button>
        </div>
        {open.map((t) => (
          <TaskRow key={t.id} t={t} />
        ))}
        {!open.length && <p className="m-0 px-4 py-3 text-[14px] text-muted">Allt klart för idag.</p>}
        {doneToday.length > 0 && (
          <>
            <div className="border-t border-line-2 px-4 pb-1 pt-3 text-[12px] text-muted">Klart idag · {doneToday.length}</div>
            {doneToday.map((t) => (
              <TaskRow key={t.id} t={t} />
            ))}
          </>
        )}
      </Card>
      <details className="card p-4">
        <summary className="cursor-pointer font-semibold">Lägg till flera uppgifter på en gång</summary>
        <p className="mb-2 mt-1 text-[13px] text-muted">Skriv fritt, en sak per rad. Varje rad blir en uppgift för idag.</p>
        <textarea className="field" value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'Svara på Vinted-meddelanden\nFota 5 plagg\nHämta paket'} />
        <button
          type="button"
          className="btn btn-soft mt-2"
          disabled={!bulk.trim()}
          onClick={async () => {
            const lines = bulk.split('\n').map((x) => x.trim()).filter(Boolean);
            if (await addTasks(lines)) setBulk('');
          }}
        >
          Gör om till uppgifter
        </button>
      </details>
    </Section>
  );
}

const prioN = (t: Task) => (t.priority === 'hög' ? 3 : t.priority === 'medel' ? 2 : 1);

function TaskRow({ t }: { t: Task }) {
  const today = todayISO();
  const late = !t.done && t.date < today;
  return (
    <div className="flex min-h-[52px] items-center gap-3 border-b border-line-2 px-4 py-2 last:border-0">
      <button
        type="button"
        role="checkbox"
        aria-checked={t.done}
        aria-label={t.done ? `Markera "${t.title}" som ej klar` : `Markera "${t.title}" som klar`}
        onClick={() => void toggleTask(t.id).then((ok) => ok && !t.done && toast('Bockad'))}
        className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-md border-[1.8px]', t.done ? 'border-accent bg-accent text-surface' : 'border-line bg-bg')}
      >
        {t.done && <span className="text-[13px] font-bold">✓</span>}
      </button>
      <span className={cx('min-w-0 flex-1 text-[15px]', t.done && 'text-muted line-through')}>
        {t.title}
        {late && <span className="ml-2 text-[12px] text-neg">{t.date.slice(5)}</span>}
        {t.date > today && <span className="ml-2 text-[12px] text-muted">{t.date.slice(5)}</span>}
      </span>
      {!t.done && t.priority !== 'medel' && <Pill tone={t.priority === 'hög' ? 'hi' : 'lo'}>{t.priority === 'hög' ? 'Hög' : 'Låg'}</Pill>}
      <button type="button" aria-label={`Ta bort "${t.title}"`} onClick={() => void deleteTask(t.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted">
        <Trash2 size={16} aria-hidden />
      </button>
    </div>
  );
}

function Summary({ ds }: { ds: Dataset }) {
  const today = todayISO();
  const text = useMemo(() => {
    const o = overview(ds, today);
    const qs = questBoard(generateQuests(ds, today)).today;
    return [
      `LÄGET ${today}`,
      `Sålt i ${monthName(o.month, false)}: ${o.soldCount} plagg för ${kr(o.soldRevenue)} (vinst ${kr(o.soldProfit)})`,
      `Bokföring ${monthName(o.month, false)}: intäkter ${kr(o.pl.revenue)}, kostnader ${kr(o.pl.costs)}, resultat ${kr(o.pl.result)}`,
      `Lager: ${o.unsoldCount} osålda, värde ${kr(o.stockValue)}, ${o.old60Count} över 60 dagar`,
      `Öppna uppgifter: ${live(ds.tasks).filter((t) => !t.done).map((t) => t.title).join(' | ') || 'inga'}`,
      `Dagens uppdrag: ${qs.map((q) => q.title).join(' | ') || 'inga'}`,
    ].join('\n');
  }, [ds, today]);
  return (
    <details className="card p-4">
      <summary className="cursor-pointer font-semibold">Sammanfattning att kopiera</summary>
      <p className="mb-2 mt-1 text-[13px] text-muted">Klistra in i en chatt eller ett meddelande när du vill stämma av läget.</p>
      <textarea readOnly className="field num min-h-[150px] text-[13px]" value={text} onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        className="btn btn-soft mt-2"
        onClick={() => {
          navigator.clipboard?.writeText(text).then(
            () => toast('Kopierat'),
            () => toast('Markera texten och kopiera', 'error'),
          );
        }}
      >
        <Copy size={16} aria-hidden /> Kopiera
      </button>
    </details>
  );
}

// ---------- Kalender ----------

function Calendar({ ds }: { ds: Dataset }) {
  const today = todayISO();
  const [mode, setMode] = useState<'m' | 'w' | 'd'>('m');
  const [cursor, setCursor] = useState(today);
  const [sel, setSel] = useState(today);
  const m = cursor.slice(0, 7);
  const items = live(ds.items);
  const dayData = (d: string) => ({
    tasks: live(ds.tasks).filter((t) => t.date === d),
    sales: items.filter((i) => isSold(i) && i.saleDate === d && i.saleBooking === 'individual'),
    vouchers: live(ds.vouchers).filter((v) => v.date === d && !(v.key?.startsWith('item:') ?? false)),
  });
  const monthAgg = items.filter((i) => isSold(i) && i.saleBooking === 'aggregate' && (i.saleDate ?? '').startsWith(m));
  const nav = (dir: 1 | -1) => {
    if (mode === 'm') setCursor(`${dir > 0 ? nextMonth(m) : prevMonth(m)}-01`);
    else setCursor(addDays(cursor, dir * (mode === 'w' ? 7 : 1)));
    if (mode === 'd') setSel(addDays(cursor, dir));
  };
  // Månadens bästa dagar (bara exakt registrerad försäljning)
  let best: { d: string; n: number; r: number } | null = null;
  let bestRev: { d: string; n: number; r: number } | null = null;
  for (let i = 1; i <= daysInMonth(m); i++) {
    const d = `${m}-${String(i).padStart(2, '0')}`;
    const s = dayData(d).sales;
    const r = s.reduce((a, x) => a + x.salePrice, 0);
    if (s.length && (!best || s.length > best.n || (s.length === best.n && r > best.r))) best = { d, n: s.length, r };
    if (r && (!bestRev || r > bestRev.r)) bestRev = { d, n: s.length, r };
  }
  const title = mode === 'm' ? monthName(m) : mode === 'w' ? `Vecka från ${+weekStart(cursor).slice(8)}/${+weekStart(cursor).slice(5, 7)}` : longDate(cursor);
  const dd = dayData(sel);
  const offset = (new Date(`${m}-01T12:00:00`).getDay() + 6) % 7;
  return (
    <>
      <Segmented
        value={mode}
        onChange={(v) => {
          setMode(v);
          if (v === 'd') setCursor(sel);
        }}
        options={[
          { value: 'd', label: 'Dag' },
          { value: 'w', label: 'Vecka' },
          { value: 'm', label: 'Månad' },
        ]}
      />
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-ghost w-11 px-0" onClick={() => nav(-1)} aria-label="Föregående">
          <ChevronLeft size={18} aria-hidden />
        </button>
        <div className="flex-1 text-center font-semibold first-letter:uppercase">{title}</div>
        <button type="button" className="btn btn-ghost w-11 px-0" onClick={() => nav(1)} aria-label="Nästa">
          <ChevronRight size={18} aria-hidden />
        </button>
        <button type="button" className="btn btn-soft px-3" onClick={() => (setCursor(today), setSel(today))}>
          Idag
        </button>
      </div>
      {mode === 'm' && (
        <Card className="p-3">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted">
            {['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((x, i) => (
              <div key={i}>{x}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: offset }, (_, i) => (
              <div key={`e${i}`} />
            ))}
            {Array.from({ length: daysInMonth(m) }, (_, i) => {
              const d = `${m}-${String(i + 1).padStart(2, '0')}`;
              const x = dayData(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSel(d)}
                  aria-label={`${longDate(d)}: ${x.sales.length} sålda, ${x.tasks.length} uppgifter`}
                  className={cx('flex aspect-square flex-col items-center justify-between rounded-lg border p-1 text-[12px]', d === sel ? 'border-accent bg-accent-soft' : d === today ? 'border-accent' : 'border-line-2 bg-surface')}
                >
                  <b className="font-semibold">{i + 1}</b>
                  <span className="flex gap-0.5">
                    {x.sales.length > 0 && <i className="h-1.5 w-1.5 rounded-full bg-[var(--c1)]" />}
                    {x.tasks.length > 0 && <i className="h-1.5 w-1.5 rounded-full bg-[var(--c3)]" />}
                    {x.vouchers.length > 0 && <i className="h-1.5 w-1.5 rounded-full bg-[var(--c2)]" />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-3 text-[11px] text-muted">
            <span className="flex items-center gap-1">
              <i className="h-1.5 w-1.5 rounded-full bg-[var(--c1)]" /> sålt
            </span>
            <span className="flex items-center gap-1">
              <i className="h-1.5 w-1.5 rounded-full bg-[var(--c3)]" /> uppgift
            </span>
            <span className="flex items-center gap-1">
              <i className="h-1.5 w-1.5 rounded-full bg-[var(--c2)]" /> bokfört
            </span>
          </div>
        </Card>
      )}
      {mode === 'w' && (
        <Card pad={false}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(weekStart(cursor), i);
            const x = dayData(d);
            const r = x.sales.reduce((a, s) => a + s.salePrice, 0);
            return (
              <button key={d} type="button" onClick={() => setSel(d)} className={cx('flex min-h-[52px] w-full items-center justify-between border-b border-line-2 px-4 py-2.5 text-left last:border-0', d === sel && 'bg-accent-soft')}>
                <span>
                  <b className="capitalize">
                    {weekdayShort(d)} {+d.slice(8)}
                  </b>
                  {d === today && <span className="ml-2 text-[12px] text-accent">idag</span>}
                  <span className="block text-[12px] text-muted">
                    {x.tasks.length} uppgifter · {x.sales.length} sålt · {x.vouchers.length} bokfört
                  </span>
                </span>
                {r > 0 && <Money v={r} className="text-[14px]" />}
              </button>
            );
          })}
        </Card>
      )}
      {mode !== 'd' && (
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label={`Flest sålda${best ? ` · ${+best.d.slice(8)}/${+best.d.slice(5, 7)}` : ''}`} value={best ? `${best.n} st` : '–'} />
          <Stat label={`Högst omsättning${bestRev ? ` · ${+bestRev.d.slice(8)}/${+bestRev.d.slice(5, 7)}` : ''}`} value={bestRev ? kr(bestRev.r) : '–'} />
        </div>
      )}
      <Section
        title={<span className="first-letter:uppercase">{longDate(sel)}</span>}
        action={
          <button type="button" className="flex items-center gap-1" onClick={() => openQuick('menu')}>
            <Plus size={14} aria-hidden /> Registrera
          </button>
        }
      >
        <Card pad={false}>
          <div className="px-4 pb-1 pt-3 text-[12px] font-semibold text-muted">Uppgifter</div>
          {dd.tasks.length ? dd.tasks.map((t) => <TaskRow key={t.id} t={t} />) : <p className="m-0 px-4 pb-2 text-[14px] text-muted">Inga.</p>}
          <div className="border-t border-line-2 px-4 pb-1 pt-3 text-[12px] font-semibold text-muted">
            Försäljning · {dd.sales.length} st · {kr(dd.sales.reduce((a, s) => a + s.salePrice, 0))}
          </div>
          {dd.sales.map((i) => (
            <a key={i.id} href={`#/lager/plagg/${i.id}`} className="flex justify-between px-4 py-2 text-[14px]">
              <span>{i.name}</span>
              <Money v={i.salePrice} />
            </a>
          ))}
          {!dd.sales.length && <p className="m-0 px-4 pb-2 text-[14px] text-muted">Ingen registrerad försäljning.</p>}
          <div className="border-t border-line-2 px-4 pb-1 pt-3 text-[12px] font-semibold text-muted">Bokfört</div>
          {dd.vouchers.map((v) => (
            <a key={v.id} href={`#/ekonomi/verifikat/${v.id}`} className="flex justify-between gap-3 px-4 py-2 text-[14px]">
              <span className="truncate">
                V{v.nr} {v.text}
              </span>
              <Money v={saleAmount(v) || v.lines.reduce((s, l) => s + l.debit, 0)} />
            </a>
          ))}
          {!dd.vouchers.length && <p className="m-0 px-4 pb-3 text-[14px] text-muted">Inget bokfört.</p>}
        </Card>
      </Section>
      {monthAgg.length > 0 && (
        <Section title={`Hela ${monthName(m, false)}`} action={<span className="text-muted">äldre plagg utan exakt dag</span>}>
          <Card className="flex justify-between">
            <span>{monthAgg.length} sålda plagg bokförda samlat</span>
            <Money v={monthAgg.reduce((a, i) => a + i.salePrice, 0)} />
          </Card>
        </Section>
      )}
    </>
  );
}
