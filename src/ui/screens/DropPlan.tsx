import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useData } from '../../data/store';
import { updateDrop } from '../../data/actions';
import { todayISO } from '../../domain/dates';
import { planVsActual, suggestPlan, type Verdict } from '../../domain/dropplan';
import { kr } from '../../domain/money';
import type { Drop, DropPlan } from '../../domain/types';
import { Card, Field, MoneyInput, Pill, Section, TextInput } from '../components/ui';

const TONE: Record<Verdict, 'lo' | 'hi' | 'me' | 'neutral'> = { bättre: 'lo', 'enligt plan': 'neutral', sämre: 'hi', 'för tidigt': 'me' };

/** Planners mall: planen för dropen och hur det gått mot den. */
export function DropPlanCard({ drop }: { drop: Drop }) {
  const ds = useData();
  const [edit, setEdit] = useState<DropPlan | null>(null);
  const today = todayISO();
  const cmp = planVsActual(ds, drop, today);

  if (edit) {
    const set = (p: Partial<DropPlan>) => setEdit({ ...edit, ...p });
    const pct = (v: number) => String(Math.round(v * 100));
    return (
      <Section title="Plan för dropen">
        <Card className="flex flex-col gap-3">
          <p className="m-0 text-[13px] text-muted">Förifyllt utifrån dina senaste drops. Ändra det du vill. Planen jämförs sedan med hur det faktiskt går.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Antal plagg">
              <TextInput inputMode="numeric" value={String(edit.count)} onCommit={(v) => set({ count: Math.max(0, parseInt(v, 10) || 0) })} />
            </Field>
            <Field label="Kostnad hem totalt">
              <MoneyInput value={edit.budget} onCommit={(v) => set({ budget: v })} />
            </Field>
            <Field label="Förväntad försäljning">
              <MoneyInput value={edit.expectedRevenue} onCommit={(v) => set({ expectedRevenue: v })} />
            </Field>
            <Field label="Förväntad vinst">
              <div className="field num flex items-center text-muted">{kr(edit.expectedRevenue - edit.budget)}</div>
            </Field>
            <Field label="Sålt efter 30 dagar (%)">
              <TextInput inputMode="numeric" value={pct(edit.sold30)} onCommit={(v) => set({ sold30: Math.min(100, Math.max(0, parseFloat(v) || 0)) / 100 })} />
            </Field>
            <Field label="Sålt efter 60 dagar (%)">
              <TextInput inputMode="numeric" value={pct(edit.sold60)} onCommit={(v) => set({ sold60: Math.min(100, Math.max(0, parseFloat(v) || 0)) / 100 })} />
            </Field>
          </div>
          <Field label="Anteckning">
            <TextInput value={edit.note} onCommit={(v) => set({ note: v })} placeholder="t.ex. mest jeans inför vintern" />
          </Field>
          <div className="flex gap-2">
            <button className="btn btn-ghost flex-1" onClick={() => setEdit(null)}>
              Avbryt
            </button>
            <button className="btn btn-primary flex-1" onClick={() => void updateDrop(drop.id, { plan: edit }, 'Plan sparad').then((ok) => ok && setEdit(null))}>
              Spara plan
            </button>
          </div>
        </Card>
      </Section>
    );
  }

  if (!drop.plan || !cmp)
    return (
      <Section title="Plan för dropen">
        <Card className="flex items-center gap-3">
          <ClipboardList size={20} className="shrink-0 text-muted" aria-hidden />
          <p className="m-0 flex-1 text-[14px] text-muted">Ingen plan än. Gör en plan så ser du sedan hur dropen går jämfört med den.</p>
          <button className="btn btn-soft shrink-0 px-4" onClick={() => setEdit(suggestPlan(ds, today))}>
            Gör plan
          </button>
        </Card>
      </Section>
    );

  const p = drop.plan;
  return (
    <Section title="Plan mot utfall" action={<button onClick={() => setEdit(p)}>Ändra plan</button>}>
      <Card pad={false}>
        <div className="border-b border-line-2 px-4 py-3 text-[14px]">
          <b>{cmp.summary}</b>
          <span className="text-muted"> Dropen är {cmp.daysOld} dagar. Planen gjordes {p.madeAt}.</span>
          {p.note && <div className="mt-0.5 text-[13px] text-muted">{p.note}</div>}
        </div>
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-left text-[12px] text-muted">
              <th className="px-4 py-2 font-medium" />
              <th className="px-2 py-2 text-right font-medium">Plan</th>
              <th className="px-2 py-2 text-right font-medium">Utfall</th>
              <th className="px-4 py-2 text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {cmp.rows.map((r) => (
              <tr key={r.label} className="border-t border-line-2">
                <td className="px-4 py-2">
                  {r.label}
                  {r.note && <span className="block text-[12px] text-muted">{r.note}</span>}
                </td>
                <td className="num px-2 py-2 text-right text-muted">{fmt(r.plan, r.unit)}</td>
                <td className="num px-2 py-2 text-right">{r.actual == null ? '–' : fmt(r.actual, r.unit)}</td>
                <td className="px-4 py-2 text-right">
                  <Pill tone={TONE[r.verdict]}>{r.verdict}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Section>
  );
}

const fmt = (v: number, unit: 'kr' | 'st' | '%') => (unit === 'kr' ? kr(v) : unit === '%' ? `${v} %` : `${v} st`);
