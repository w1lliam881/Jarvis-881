// Anslagstavlan på torget i Agentbyn: veckans mål och uppgifter att bocka av, och rådets tips från Noter.
import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { useData } from '../../data/store';
import { addTask, deleteGoal, saveGoal, toggleTask } from '../../data/actions';
import { addDays, isoWeek, todayISO, weekStart } from '../../domain/dates';
import { live } from '../../domain/metrics';
import { monthReport } from '../../domain/monthly';
import { kr } from '../../domain/money';
import { agoText, inlineParts, parseMarkdown, type AgentRun } from '../../domain/agents';
import type { Goal, Task } from '../../domain/types';
import { cx } from '../components/ui';

const CORK = '#B88A57';
const PAPER = '#F4F1E6';
const INK = '#17201B';
const MUTED = '#6B6253';
const PIN = ['#C2324A', '#2C5D8A', '#E9B44C', '#1F5A44'];

export function BoardView({ runs }: { runs: AgentRun[] }) {
  const ds = useData();
  const today = todayISO();
  const week = isoWeek(today);
  const w0 = weekStart(today);
  const w6 = addDays(w0, 6);
  const goals = live(ds.goals).filter((g) => g.week === week);
  const tasks = live(ds.tasks)
    .filter((t) => (!t.done && t.date <= w6) || (t.done && t.doneAt && t.doneAt >= w0))
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.date < b.date ? -1 : 1));
  const tips = runs.filter((r) => r.agent === 'noter' && /^Rådets tips/i.test(r.title)).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  const meeting = runs.filter((r) => /veckomöte/i.test(r.title)).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  const month = useMemo(() => monthReport(ds, today.slice(0, 7), today), [ds, today]);
  const [goalText, setGoalText] = useState('');
  const [taskText, setTaskText] = useState('');
  const done = goals.filter((g) => g.done).length + tasks.filter((t) => t.done).length;
  const total = goals.length + tasks.length;

  return (
    <>
      <header className="px-5 pb-4 pt-[max(20px,env(safe-area-inset-top))] lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-[1216px]">
          <a href="#/byn" className="inline-flex min-h-[36px] items-center gap-1.5 text-[13px] text-[#A9B5AE]">
            <ArrowLeft size={15} aria-hidden /> Tillbaka till byn
          </a>
          <div className="font-pixel mt-2 text-[10px] uppercase tracking-wider text-[#9EDBB8]">Torget</div>
          <h1 className="m-0 mt-2 font-serif text-[30px] font-semibold leading-tight">Anslagstavlan</h1>
          <p className="m-0 mt-1 text-[14px] text-[#D5DDD8]">
            Vecka {week.slice(-2)} · {done} av {total} avbockade
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 lg:px-8">
        <div className="relative border-[6px] p-4 lg:p-6" style={{ background: `repeating-linear-gradient(45deg, ${CORK} 0 6px, #B0814F 6px 12px)`, borderColor: '#6B3E1E', boxShadow: '0 0 0 3px #4A2E16, 8px 8px 0 rgba(0,0,0,.4)' }}>
          <div className="grid gap-5 lg:grid-cols-3">
            <Note pin={0} title="Veckans mål">
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {goals.map((g) => (
                  <CheckRow key={g.id} done={!!g.done} label={g.name} onToggle={() => void saveGoal({ name: g.name, done: !g.done }, g.id)} onDelete={() => void deleteGoal(g.id)} />
                ))}
                {!goals.length && <li className="text-[13px]" style={{ color: MUTED }}>Inga mål för veckan än. Planner föreslår mål på måndagar.</li>}
              </ul>
              <AddRow
                value={goalText}
                onChange={setGoalText}
                placeholder="Nytt mål för veckan…"
                onAdd={() => goalText.trim() && void saveGoal({ name: goalText.trim(), week, done: false, kind: 'manual' }).then((ok) => ok && setGoalText(''))}
              />
              <div className="mt-3 border-t pt-2 text-[12px]" style={{ borderColor: '#D9D2C0', color: MUTED }}>
                Månadsmålet: {kr(month.revenue)} av {kr(month.goal.min)} ({month.revenueStatus === 'under' ? 'under' : month.revenueStatus === 'över' ? 'över' : 'inom'} målet med nuvarande takt)
              </div>
            </Note>

            <Note pin={1} title="Veckans uppgifter">
              <ul className="m-0 flex max-h-[420px] list-none flex-col gap-1 overflow-y-auto p-0">
                {tasks.map((t) => (
                  <CheckRow key={t.id} done={t.done} label={t.title} sub={taskSub(t, today)} onToggle={() => void toggleTask(t.id)} />
                ))}
                {!tasks.length && <li className="text-[13px]" style={{ color: MUTED }}>Inga uppgifter den här veckan.</li>}
              </ul>
              <AddRow value={taskText} onChange={setTaskText} placeholder="Ny uppgift…" onAdd={() => taskText.trim() && void addTask(taskText.trim()).then((ok) => ok && setTaskText(''))} />
            </Note>

            <Note pin={2} title="Rådets tips">
              {tips ? (
                <>
                  <div className="text-[12px]" style={{ color: MUTED }}>
                    Noter, {agoText(tips.at)}
                  </div>
                  <div className="mt-1 text-[14px] font-semibold">{tips.summary}</div>
                  {tips.body && <MiniMarkdown src={tips.body} />}
                </>
              ) : (
                <p className="m-0 text-[13px]" style={{ color: MUTED }}>
                  Här sätter Noter upp det rådet kommit fram till: efter veckomötet på fredag kl 15 och efter rådets samtal under veckan.
                </p>
              )}
              {meeting && meeting !== tips && (
                <a href="#/byn/noter" className="mt-3 block border-t pt-2 text-[13px] underline" style={{ borderColor: '#D9D2C0', color: INK }}>
                  Protokoll från veckomötet ({agoText(meeting.at)})
                </a>
              )}
            </Note>
          </div>
        </div>
      </div>
    </>
  );
}

function taskSub(t: Task, today: string): string | undefined {
  if (t.done) return undefined;
  if (t.date < today) return `försenad sedan ${t.date.slice(5)}`;
  if (t.date > today) return t.date.slice(5);
  return t.xp ? `+${t.xp} XP i spelet` : undefined;
}

function Note({ pin, title, children }: { pin: number; title: string; children: React.ReactNode }) {
  return (
    <section className="relative p-4 pt-5 shadow-[3px_4px_0_rgba(0,0,0,.25)]" style={{ background: PAPER, color: INK, transform: `rotate(${[-0.6, 0.5, -0.3][pin % 3]}deg)` }}>
      <i className="absolute left-1/2 top-1.5 block h-3 w-3 -translate-x-1/2 rounded-full" style={{ background: PIN[pin % PIN.length], boxShadow: '0 1px 0 rgba(0,0,0,.4)' }} aria-hidden />
      <h2 className="font-pixel m-0 mb-3 text-[11px] uppercase">{title}</h2>
      {children}
    </section>
  );
}

function CheckRow({ done, label, sub, onToggle, onDelete }: { done: boolean; label: string; sub?: string; onToggle: () => void; onDelete?: () => void }) {
  return (
    <li className="flex min-h-[44px] items-center gap-2.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Bocka ur "${label}"` : `Bocka av "${label}"`}
        onClick={onToggle}
        className={cx('grid h-7 w-7 shrink-0 place-items-center border-2', done ? 'border-[#1F5A44] bg-[#1F5A44] text-white' : 'border-[#6B6253] bg-white')}
      >
        {done && <Check size={16} strokeWidth={3} aria-hidden />}
      </button>
      <span className="min-w-0 flex-1">
        <span className={cx('block text-[14px] leading-snug', done && 'line-through opacity-60')}>{label}</span>
        {sub && <span className="block text-[11px]" style={{ color: /försenad/.test(sub) ? '#A33A26' : MUTED }}>{sub}</span>}
      </span>
      {onDelete && (
        <button type="button" onClick={onDelete} className="grid h-9 w-9 shrink-0 place-items-center" style={{ color: MUTED }} aria-label={`Ta bort "${label}"`}>
          <Trash2 size={14} aria-hidden />
        </button>
      )}
    </li>
  );
}

function AddRow({ value, onChange, placeholder, onAdd }: { value: string; onChange: (v: string) => void; placeholder: string; onAdd: () => void }) {
  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd();
      }}
    >
      <input className="min-w-0 flex-1 border-2 bg-white px-2.5 py-2 text-[16px]" style={{ borderColor: '#D9D2C0', color: INK }} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center border-2" style={{ background: '#1F5A44', color: 'white', borderColor: INK }} aria-label="Lägg till">
        <Plus size={18} aria-hidden />
      </button>
    </form>
  );
}

function MiniMarkdown({ src }: { src: string }) {
  const blocks = useMemo(() => parseMarkdown(src), [src]);
  const inline = (s: string) => inlineParts(s).map((p, i) => (p.bold ? <b key={i}>{p.text}</b> : <span key={i}>{p.text}</span>));
  return (
    <div className="mt-2 flex flex-col gap-1.5 text-[13px] leading-snug">
      {blocks.map((b, i) =>
        b.kind === 'p' ? (
          <p key={i} className="m-0">
            {inline(b.text)}
          </p>
        ) : b.kind === 'ul' || b.kind === 'ol' ? (
          <ul key={i} className="m-0 flex list-none flex-col gap-1 p-0">
            {b.items.map((it, j) => (
              <li key={j} className="flex gap-1.5">
                <span aria-hidden>·</span>
                <span>{inline(it)}</span>
              </li>
            ))}
          </ul>
        ) : b.kind === 'h' && b.level > 1 ? (
          <div key={i} className="mt-1 font-semibold">
            {inline(b.text)}
          </div>
        ) : null,
      )}
    </div>
  );
}

export type { Goal };
