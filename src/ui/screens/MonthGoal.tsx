import { useMemo, useState } from 'react';
import { useData } from '../../data/store';
import { updateSettings } from '../../data/actions';
import { monthName, nextMonth, prevMonth, todayISO } from '../../domain/dates';
import { monthReport } from '../../domain/monthly';
import { kr } from '../../domain/money';
import { Card, Field, MoneyInput, Section, Stat, TextInput, cx } from '../components/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Advisors månadsrapport: försäljning och vinstmarginal mot målet. */
export function MonthGoalView() {
  const ds = useData();
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 7));
  const r = useMemo(() => monthReport(ds, month, today), [ds, month, today]);
  const max = Math.max(r.goal.max * 1.15, r.projected, r.revenue);
  const pct = (o: number) => `${Math.min(100, (o / max) * 100)}%`;
  const current = today.startsWith(month);
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <button className="btn btn-ghost h-11 w-11 min-h-0 px-0" onClick={() => setMonth(prevMonth(month))} aria-label="Förra månaden">
          <ChevronLeft size={18} aria-hidden />
        </button>
        <div className="text-center font-semibold first-letter:uppercase">{monthName(month)}</div>
        <button className="btn btn-ghost h-11 w-11 min-h-0 px-0" disabled={current} onClick={() => setMonth(nextMonth(month))} aria-label="Nästa månad">
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] text-muted">Försäljning mot målet {kr(r.goal.min)}–{kr(r.goal.max)}</span>
          <span className={cx('text-[13px] font-semibold', r.revenueStatus === 'under' ? 'text-me' : 'text-pos')}>
            {r.revenueStatus === 'under' ? 'Under målet' : r.revenueStatus === 'över' ? 'Över målet' : 'Inom målet'}
            {current && r.daysPassed < r.daysTotal ? ' (med nuvarande takt)' : ''}
          </span>
        </div>
        <div className="relative h-7 overflow-hidden rounded-lg bg-surface-2" role="img" aria-label={`${kr(r.revenue)} sålt, mål ${kr(r.goal.min)} till ${kr(r.goal.max)}`}>
          <i className="absolute inset-y-0 block bg-lo-bg" style={{ left: pct(r.goal.min), width: `calc(${pct(r.goal.max)} - ${pct(r.goal.min)})` }} />
          {current && r.projected > r.revenue && <i className="absolute inset-y-2 left-0 block rounded-r bg-accent/25" style={{ width: pct(r.projected) }} />}
          <i className="absolute inset-y-2 left-0 block rounded-r bg-accent" style={{ width: pct(r.revenue) }} />
        </div>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Stat label="Sålt" value={kr(r.revenue)} sub={`${r.sold} plagg`} />
          <Stat label={current && r.daysPassed < r.daysTotal ? 'Takten pekar mot' : 'Hela månaden'} value={kr(r.projected)} sub={`dag ${r.daysPassed} av ${r.daysTotal}`} />
          <Stat label="Vinstmarginal" value={r.sold ? `${r.marginPct.toLocaleString('sv-SE')} %` : '–'} sub={`mål ${r.goal.marginPct} %`} tone={!r.sold ? undefined : r.marginStatus === 'nådd' ? 'pos' : 'warn'} />
          <Stat label="Vinst" value={kr(r.profit)} sub="pris minus hemkostnad" />
        </div>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[14px]">
          {r.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </Card>

      <Section title="Sex månader">
        <Card pad={false}>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                <th className="px-4 py-2 font-medium">Månad</th>
                <th className="px-2 py-2 text-right font-medium">Sålt</th>
                <th className="px-2 py-2 text-right font-medium">Plagg</th>
                <th className="px-4 py-2 text-right font-medium">Marginal</th>
              </tr>
            </thead>
            <tbody>
              {[...r.trend].reverse().map((m) => (
                <tr key={m.month} className={cx('border-t border-line-2', m.month === month && 'bg-surface-2')}>
                  <td className="px-4 py-2 first-letter:uppercase">{monthName(m.month, false)}</td>
                  <td className={cx('num px-2 py-2 text-right', m.revenue >= r.goal.min ? 'text-pos' : '')}>{kr(m.revenue)}</td>
                  <td className="num px-2 py-2 text-right text-muted">{m.sold}</td>
                  <td className={cx('num px-4 py-2 text-right', m.sold && m.marginPct >= r.goal.marginPct ? 'text-pos' : m.sold ? 'text-me' : 'text-muted')}>{m.sold ? `${m.marginPct.toLocaleString('sv-SE')} %` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="m-0 px-1 text-[12px] text-muted">Räknat på plaggen som sålts under månaden: pris minus hemkostnad (inköp, frakt, tull, förpackning). Advisor skriver en månadsrapport den första varje månad.</p>
      </Section>

      <Section title="Målet">
        <Card className="grid grid-cols-3 gap-3">
          <Field label="Lägst">
            <MoneyInput value={r.goal.min} onCommit={(v) => v > 0 && void updateSettings({ monthGoalMin: v }, 'Månadsmål sparat')} />
          </Field>
          <Field label="Högst">
            <MoneyInput value={r.goal.max} onCommit={(v) => v > 0 && void updateSettings({ monthGoalMax: v }, 'Månadsmål sparat')} />
          </Field>
          <Field label="Marginal (%)">
            <TextInput inputMode="numeric" value={String(r.goal.marginPct)} onCommit={(v) => parseFloat(v) > 0 && void updateSettings({ marginGoalPct: parseFloat(v.replace(',', '.')) }, 'Marginalmål sparat')} />
          </Field>
        </Card>
      </Section>
    </>
  );
}
