// Chatten i Agentbyn: telefonen i varje hus och byrådet (gruppchatten), också i en telefon.
// Agenterna kan fråga dig saker med svarsknappar. Godkända förslag blir uppgifter i Att göra.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, MessagesSquare, Send, Smartphone, X } from 'lucide-react';
import { markSeen, seenAt, useAgentChat } from '../../data/chat';
import { addTask } from '../../data/actions';
import {
  AGENTS,
  CHAT_SCHEDULE,
  agentById,
  agoText,
  answerTo,
  dmThread,
  nextRun,
  openQuestions,
  pendingProposals,
  stockholmParts,
  taskFromProposal,
  threadMessages,
  unanswered,
  unreadCount,
  whenText,
  type AgentDef,
  type AgentMessage,
  type AgentRun,
  type ChatThread,
} from '../../domain/agents';
import { AgentSprite } from '../../game/village';
import { cx } from '../components/ui';
import { toast } from '../Boot';

const INK = '#17201B';
const CREAM = '#F4F1E6';
const MINT = '#9EDBB8';
const SUN = '#E9B44C';
const MUTED = '#A9B5AE';
const LINE = 'rgba(233,238,234,.14)';
const RED = '#C2324A';

type Chat = ReturnType<typeof useAgentChat>;

const QUICK_DM = ['Vad har du jobbat med idag?', 'Vad är planen för idag?', 'Vad tycker du att jag ska göra nu?'];
const QUICK_GROUP = ['Vad är viktigast den här veckan?', 'Hur går juldroppen?', 'Något ni behöver från mig?'];

// ---------- Gemensamt: själva telefonen ----------

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** Ram, statusrad och rubrik. modal = fälls upp över sidan; annars ligger den inbyggd på sidan. */
function PhoneShell({
  modal,
  leaving,
  label,
  header,
  onClose,
  children,
  footer,
  xmas,
}: {
  modal: boolean;
  leaving?: boolean;
  label: string;
  header: ReactNode;
  onClose?: () => void;
  children: ReactNode;
  footer: ReactNode;
  xmas: boolean;
}) {
  const now = useClock();
  const p = stockholmParts(now);
  const clock = `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`;
  const body = (
    <div
      className={cx('relative flex flex-col border-[6px] p-2.5 pb-3', modal ? cx('h-[min(88dvh,760px)] w-[min(100%,420px)]', leaving ? 'phone-down' : 'phone-up') : 'h-[min(560px,70vh)] w-full')}
      style={{ background: '#1A1F1C', borderColor: '#0A0D0B', boxShadow: '0 0 0 3px #3A4540, 8px 8px 0 rgba(0,0,0,.45)', borderRadius: 26 }}
      role={modal ? undefined : 'region'}
      aria-label={modal ? undefined : label}
    >
      <div className="mx-auto mb-2 flex h-4 items-center gap-2" aria-hidden>
        <i className="block h-1.5 w-12" style={{ background: '#3A4540' }} />
        <i className="block h-2 w-2" style={{ background: '#3A4540' }} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ background: '#0E1F18', borderRadius: 12 }}>
        <div className="font-pixel flex items-center justify-between px-3 pt-2 text-[8px]" style={{ color: MUTED }}>
          <span>{clock}</span>
          <span className="flex items-center gap-1" aria-hidden>
            <i className="block h-1.5 w-1" style={{ background: MUTED }} />
            <i className="block h-2 w-1" style={{ background: MUTED }} />
            <i className="block h-2.5 w-1" style={{ background: MUTED }} />
            <i className="ml-1 block h-2 w-4 border" style={{ borderColor: MUTED, background: `linear-gradient(90deg, ${MINT} 70%, transparent 70%)` }} />
          </span>
        </div>
        <div className="flex items-center gap-3 border-b-2 px-3 py-2.5" style={{ borderColor: LINE, background: xmas ? 'rgba(194,50,74,.22)' : 'rgba(0,0,0,.25)' }}>
          {header}
          {onClose && (
            <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center border-2 text-[#E9EEEA]" style={{ borderColor: LINE }} aria-label="Lägg ner telefonen">
              <ChevronDown size={18} aria-hidden />
            </button>
          )}
        </div>
        {children}
        {footer}
      </div>
      {modal && onClose && <button type="button" onClick={onClose} className="mx-auto mt-2 block h-1.5 w-24" style={{ background: '#3A4540', borderRadius: 4 }} aria-label="Lägg ner telefonen" />}
    </div>
  );
  if (!modal) return body;
  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center lg:items-center" role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" aria-label="Stäng telefonen" tabIndex={-1} className="fade-in absolute inset-0 bg-black/55" onClick={onClose} />
      {body}
    </div>,
    document.body,
  );
}

/** Hanterar Escape, bakåtknappen och att sidan inte scrollar bakom telefonen. */
function useModal(onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onHash = () => onClose();
    window.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', onHash);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHash);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

function Composer({ placeholder, quick, busy, onSend, hint }: { placeholder: string; quick: string[]; busy: boolean; onSend: (t: string) => Promise<boolean>; hint?: string }) {
  const [text, setText] = useState('');
  return (
    <>
      <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
        {quick.map((q) => (
          <button key={q} type="button" disabled={busy} onClick={() => void onSend(q)} className="shrink-0 border-2 px-2 py-1.5 text-[12px] text-[#E9EEEA]" style={{ borderColor: LINE, background: 'rgba(255,255,255,.04)' }}>
            {q}
          </button>
        ))}
      </div>
      <form
        className="flex items-center gap-2 border-t-2 p-2.5"
        style={{ borderColor: LINE }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (await onSend(text)) setText('');
        }}
      >
        <input
          className="min-w-0 flex-1 border-2 px-3 py-2 text-[16px] text-[#E9EEEA] outline-none placeholder:text-[#7F8C85]"
          style={{ background: '#0A1712', borderColor: LINE }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          title={hint}
          maxLength={2000}
        />
        <button type="submit" disabled={busy || !text.trim()} className="grid h-11 w-11 shrink-0 place-items-center border-2 disabled:opacity-50" style={{ background: SUN, color: INK, borderColor: INK }} aria-label="Skicka">
          <Send size={17} aria-hidden />
        </button>
      </form>
    </>
  );
}

/** Skicka-funktion med felmeddelande och "upptagen"-läge. */
function useSender(chat: Chat, thread: ChatThread) {
  const [busy, setBusy] = useState(false);
  const send = async (body: string, replyTo: string | null = null): Promise<boolean> => {
    if (!body.trim() || busy) return false;
    setBusy(true);
    const err = await chat.send(thread, body, replyTo);
    setBusy(false);
    if (err) toast(err, 'error');
    return !err;
  };
  return { busy, send };
}

/** En fråga från en agent, med svarsknappar. Efter svaret visas vad du svarade. */
function Question({ m, msgs, onAnswer, busy }: { m: AgentMessage; msgs: AgentMessage[]; onAnswer: (text: string, id: string) => void; busy: boolean }) {
  const ans = answerTo(msgs, m.id);
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {ans ? (
        <div className="text-[12px]" style={{ color: '#4A5A52' }}>
          Du svarade: <b>{ans.body}</b>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {(m.options ?? []).map((o) => (
              <button key={o} type="button" disabled={busy} onClick={() => onAnswer(o, m.id)} className="min-h-[40px] border-2 px-3 text-[13px] font-semibold" style={{ background: MINT, color: INK, borderColor: INK }}>
                {o}
              </button>
            ))}
          </div>
          <div className="text-[11px]" style={{ color: '#4A5A52' }}>
            {m.options?.length ? 'Tryck på ett svar, eller skriv ett eget nedan.' : 'Skriv ditt svar nedan.'}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Telefonen i ett hus ----------

type Line = { key: string; at: string; mine: boolean; kind: AgentMessage['kind'] | 'jobb'; title?: string; body: string; status?: AgentMessage['status']; msg?: AgentMessage };

function linesFor(def: AgentDef, msgs: AgentMessage[], runs: AgentRun[]): Line[] {
  const t = dmThread(def.id);
  const out: Line[] = threadMessages(msgs, t).map((m) => ({ key: m.id, at: m.at, mine: m.sender === 'du', kind: m.kind, body: m.body, status: m.status, msg: m }));
  for (const r of runs.slice(0, 6)) out.push({ key: `run-${r.id}`, at: r.at, mine: false, kind: 'jobb', title: r.title, body: r.summary });
  return out.sort((a, b) => (a.at < b.at ? -1 : 1));
}

/** Knappen i huset som fäller upp telefonen. */
export function PhoneButton({ def, runs, xmas }: { def: AgentDef; runs: AgentRun[]; xmas: boolean }) {
  const chat = useAgentChat();
  // Öppna direkt om man kom hit via "be om något" (?chatt=1)
  const [open, setOpen] = useState(() => /[?&]chatt=1/.test(location.hash));
  const thread = dmThread(def.id);
  const [seen, setSeen] = useState(() => seenAt(thread));
  const msgs = chat.msgs ?? [];
  const unread = unreadCount(msgs, thread, seen) + openQuestions(msgs, thread).length;
  const close = () => {
    markSeen(thread);
    setSeen(new Date().toISOString());
    setOpen(false);
  };
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-pixel fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-40 flex h-[52px] items-center gap-2 border-2 px-4 text-[10px] uppercase tracking-wide lg:bottom-8 lg:right-8"
        style={{ background: xmas ? RED : SUN, color: xmas ? CREAM : INK, borderColor: INK, boxShadow: `4px 4px 0 ${INK}` }}
        aria-label={`Öppna telefonen och chatta med ${def.name}${unread ? `, ${unread} nya` : ''}`}
      >
        <Smartphone size={18} aria-hidden /> Chatta
        {unread > 0 && (
          <span className="absolute -right-2 -top-2 grid h-6 min-w-6 place-items-center border-2 px-1 text-[9px]" style={{ background: CREAM, color: INK, borderColor: INK }}>
            {unread}
          </span>
        )}
      </button>
      {open && <Phone def={def} runs={runs} chat={chat} onClose={close} xmas={xmas} />}
    </>
  );
}

function Phone({ def, runs, chat, onClose, xmas }: { def: AgentDef; runs: AgentRun[]; chat: Chat; onClose: () => void; xmas: boolean }) {
  const [leaving, setLeaving] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const now = new Date();
  const thread: ChatThread = dmThread(def.id);
  const msgs = chat.msgs ?? [];
  const lines = useMemo(() => linesFor(def, msgs, runs), [def, msgs, runs]);
  const waiting = unanswered(msgs, thread).length;
  const nextReply = nextRun(CHAT_SCHEDULE, now);
  const { busy, send } = useSender(chat, thread);
  const drop = () => {
    setLeaving(true);
    setTimeout(onClose, 220);
  };
  useModal(drop, true);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [lines.length]);
  const open = openQuestions(msgs, thread);

  return (
    <PhoneShell
      modal
      leaving={leaving}
      xmas={xmas}
      label={`Telefonen: chatt med ${def.name}`}
      onClose={drop}
      header={
        <>
          <span className="grid h-11 w-11 shrink-0 place-items-center border-2" style={{ background: def.wall, borderColor: INK }}>
            <AgentSprite def={def} size={34} xmas={xmas} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-[#E9EEEA]">{def.name}</span>
            <span className="block text-[11px]" style={{ color: MUTED }}>
              {def.house} · {waiting ? `svarar ${nextReply ? whenText(nextReply, now) : 'snart'}` : 'svarar varannan timme 08–22'}
            </span>
          </span>
        </>
      }
      footer={
        <Composer
          placeholder={open.length ? `Svara ${def.name} eller skriv något eget…` : `Skriv till ${def.name}…`}
          quick={QUICK_DM}
          busy={busy}
          onSend={(t) => send(t, open.length === 1 ? open[0].id : null)}
        />
      }
    >
      <div ref={list} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
        {chat.err && (
          <p className="m-0 border-2 p-2 text-[12px]" style={{ borderColor: '#F4A08F55', color: '#F4A08F' }}>
            {chat.err}
          </p>
        )}
        {!lines.length && (
          <div className="m-auto max-w-[260px] text-center text-[13px]" style={{ color: MUTED }}>
            <div className="font-pixel mb-2 text-[9px]" style={{ color: SUN }}>
              Ny kontakt
            </div>
            Skriv vad du undrar. {def.name} läser och svarar nästa gång agenterna går sin runda, varannan timme mellan 08 och 22. Ibland frågar {def.name} dig något här.
          </div>
        )}
        {lines.map((l) => (
          <Bubble key={l.key} l={l} def={def} now={now} msgs={msgs} busy={busy} onAnswer={(t, id) => void send(t, id)} />
        ))}
        {waiting > 0 && (
          <div className="font-pixel self-start px-1 text-[8px]" style={{ color: MUTED }}>
            Väntar på svar · {def.name} svarar {nextReply ? whenText(nextReply, now) : 'snart'}
          </div>
        )}
      </div>
    </PhoneShell>
  );
}

function Bubble({ l, def, now, msgs, busy, onAnswer }: { l: Line; def: AgentDef; now: Date; msgs: AgentMessage[]; busy: boolean; onAnswer: (t: string, id: string) => void }) {
  if (l.mine)
    return (
      <div className="flex max-w-[85%] flex-col items-end self-end">
        <div className="border-2 px-3 py-2 text-[14px] leading-snug" style={{ background: MINT, color: INK, borderColor: INK, boxShadow: `2px 2px 0 ${INK}` }}>
          {l.body}
        </div>
        <span className="mt-0.5 text-[10px]" style={{ color: MUTED }}>
          {agoText(l.at, now)}
        </span>
      </div>
    );
  const tag = l.kind === 'jobb' ? 'Jobbade med' : l.kind === 'plan' ? 'Planen' : l.kind === 'förslag' ? 'Förslag' : l.kind === 'fråga' ? 'Fråga till dig' : null;
  return (
    <div className="flex max-w-[90%] items-end gap-1.5 self-start">
      <span className="mb-4 grid h-7 w-7 shrink-0 place-items-center" style={{ background: def.wall }}>
        <AgentSprite def={def} size={22} />
      </span>
      <div className="flex min-w-0 flex-col">
        <div
          className="border-2 px-3 py-2 text-[14px] leading-snug"
          style={{ background: l.kind === 'jobb' ? '#24372E' : l.kind === 'fråga' ? '#FFF3D6' : CREAM, color: l.kind === 'jobb' ? '#E9EEEA' : INK, borderColor: l.kind === 'fråga' ? SUN : INK, boxShadow: `2px 2px 0 ${INK}` }}
        >
          {tag && (
            <div className="font-pixel mb-1 text-[8px] uppercase" style={{ color: l.kind === 'jobb' ? SUN : l.kind === 'fråga' ? '#8A5A0B' : RED }}>
              {tag}
              {l.status && l.status !== 'väntar' ? ` · ${l.status}` : ''}
            </div>
          )}
          {l.title && <div className="font-semibold">{l.title}</div>}
          <div className="whitespace-pre-line">{l.body}</div>
          {l.kind === 'fråga' && l.msg && <Question m={l.msg} msgs={msgs} busy={busy} onAnswer={onAnswer} />}
        </div>
        <span className="mt-0.5 text-[10px]" style={{ color: MUTED }}>
          {agoText(l.at, now)}
        </span>
      </div>
    </div>
  );
}

// ---------- Byrådet: agenternas gruppchatt, i en telefon ----------

/** Hur mycket som väntar i byrådet: nya meddelanden, förslag som vill ha ditt ja och frågor. */
export function useCouncil() {
  const chat = useAgentChat();
  const [seen, setSeen] = useState(() => seenAt('grupp'));
  const msgs = chat.msgs ?? [];
  const pending = pendingProposals(msgs);
  const questions = openQuestions(msgs, 'grupp');
  const unread = unreadCount(msgs, 'grupp', seen);
  const last = threadMessages(msgs, 'grupp').at(-1);
  const markRead = () => {
    markSeen('grupp');
    setSeen(new Date().toISOString());
  };
  return { chat, pending, questions, unread, last, markRead };
}

/** Byrådet som telefon. embedded = ligger på sidan (dator), annars fälls den upp. */
export function CouncilPhone({ xmas, embedded = false, onClose }: { xmas: boolean; embedded?: boolean; onClose?: () => void }) {
  const { chat, pending, markRead } = useCouncil();
  const [leaving, setLeaving] = useState(false);
  const [all, setAll] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const now = new Date();
  const msgs = chat.msgs ?? [];
  const thread = useMemo(() => threadMessages(msgs, 'grupp'), [msgs]);
  const shown = all ? thread : thread.slice(-40);
  const open = openQuestions(msgs, 'grupp');
  const { busy, send } = useSender(chat, 'grupp');
  const drop = () => {
    markRead();
    setLeaving(true);
    setTimeout(() => onClose?.(), 220);
  };
  useModal(drop, !embedded);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [thread.length]);
  useEffect(() => {
    if (embedded) markRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, thread.length]);

  const decide = async (m: AgentMessage, s: 'godkänd' | 'avvisad') => {
    const err = await chat.decide(m.id, s);
    if (err) return toast(err, 'error');
    if (s === 'godkänd') {
      const title = taskFromProposal(m);
      const ok = await addTask(`${title} (${agentById(m.sender)?.name ?? 'agent'})`, undefined, 'hög');
      toast(ok ? 'Godkänt och tillagt i Att göra' : 'Godkänt, men uppgiften kunde inte sparas', ok ? 'ok' : 'error');
    } else toast('Avvisat');
  };

  return (
    <PhoneShell
      modal={!embedded}
      leaving={leaving}
      xmas={xmas}
      label="Byrådet, agenternas gruppchatt"
      onClose={embedded ? undefined : drop}
      header={
        <>
          <span className="grid h-11 w-11 shrink-0 grid-cols-2 place-items-center border-2" style={{ background: '#24372E', borderColor: INK }} aria-hidden>
            {AGENTS.slice(0, 4).map((a) => (
              <AgentSprite key={a.id} def={a} size={18} />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-[#E9EEEA]">Byrådet</span>
            <span className="block truncate text-[11px]" style={{ color: MUTED }}>
              {AGENTS.length} agenter och du{pending.length ? ` · ${pending.length} väntar på ditt ja` : ''}
            </span>
          </span>
        </>
      }
      footer={<Composer placeholder={open.length ? 'Svara på frågan eller skriv till alla…' : 'Skriv till alla agenter…'} quick={QUICK_GROUP} busy={busy} onSend={(t) => send(t, open.length === 1 ? open[0].id : null)} />}
    >
      <div ref={list} className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-3">
        {chat.err && <p className="m-0 text-[12px] text-[#F4A08F]">{chat.err}</p>}
        {thread.length > shown.length && (
          <button type="button" onClick={() => setAll(true)} className="self-center text-[12px] underline" style={{ color: MUTED }}>
            Visa äldre ({thread.length - shown.length})
          </button>
        )}
        {!thread.length && !chat.err && (
          <p className="m-auto max-w-[300px] text-center text-[13px]" style={{ color: MUTED }}>
            {chat.msgs == null ? 'Hämtar…' : 'Tyst i byrådet än. Agenterna samlas varje dag vid lunch, skriver vad de ser och frågar dig ibland. Inget görs utan ditt ja.'}
          </p>
        )}
        {shown.map((m) => (
          <GroupLine key={m.id} m={m} now={now} msgs={msgs} busy={busy} onDecide={decide} onAnswer={(t, id) => void send(t, id)} />
        ))}
      </div>
    </PhoneShell>
  );
}

/** Kort högt upp på sidan (mobil) som öppnar byrådet, med vad som väntar. */
export function CouncilBar({ xmas }: { xmas: boolean }) {
  const { pending, questions, unread, last } = useCouncil();
  const [open, setOpen] = useState(() => /[?&]chatt=grupp/.test(location.hash));
  const def = last && last.sender !== 'du' ? agentById(last.sender) : undefined;
  const waiting = pending.length + questions.length;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 border-2 p-3 text-left transition-colors hover:bg-black/30"
        style={{ borderColor: waiting ? SUN : xmas ? 'rgba(194,50,74,.6)' : LINE, background: 'rgba(0,0,0,.25)' }}
        aria-label={`Öppna byrådet${waiting ? `, ${waiting} väntar på dig` : ''}`}
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center border-2" style={{ background: SUN, color: INK, borderColor: INK }}>
          <MessagesSquare size={20} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="font-pixel text-[11px]" style={{ color: SUN }}>
              Byrådet
            </span>
            {(unread > 0 || waiting > 0) && (
              <span className="text-[12px] font-semibold" style={{ color: waiting ? SUN : MINT }}>
                {waiting ? `${waiting} väntar på dig` : `${unread} nya`}
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-[#D5DDD8]">{last ? `${def ? `${def.name}: ` : 'Du: '}${last.body}` : 'Agenternas gruppchatt. Tryck för att öppna.'}</span>
        </span>
        <Smartphone size={18} className="shrink-0" style={{ color: MUTED }} aria-hidden />
      </button>
      {open && <CouncilPhone xmas={xmas} onClose={() => setOpen(false)} />}
    </>
  );
}

function GroupLine({
  m,
  now,
  msgs,
  busy,
  onDecide,
  onAnswer,
}: {
  m: AgentMessage;
  now: Date;
  msgs: AgentMessage[];
  busy: boolean;
  onDecide: (m: AgentMessage, s: 'godkänd' | 'avvisad') => void;
  onAnswer: (t: string, id: string) => void;
}) {
  if (m.sender === 'du')
    return (
      <div className="flex max-w-[85%] flex-col items-end self-end">
        <div className="border-2 px-3 py-2 text-[14px] leading-snug" style={{ background: MINT, color: INK, borderColor: INK, boxShadow: `2px 2px 0 ${INK}` }}>
          {m.body}
        </div>
        <span className="mt-0.5 text-[10px]" style={{ color: MUTED }}>
          {m.author && !/^william/i.test(m.author) ? `${m.author.split('@')[0]} · ` : ''}
          {agoText(m.at, now)}
        </span>
      </div>
    );
  const def = agentById(m.sender) ?? AGENTS[0];
  const proposal = m.kind === 'förslag';
  const question = m.kind === 'fråga';
  return (
    <div className="flex max-w-[94%] items-start gap-2 self-start">
      <a href={`#/byn/${def.id}`} className="grid h-8 w-8 shrink-0 place-items-center" style={{ background: def.wall }} aria-label={`Gå till ${def.house}`}>
        <AgentSprite def={def} size={24} />
      </a>
      <div className="flex min-w-0 flex-col">
        <span className="mb-0.5 flex items-baseline gap-2 text-[11px]">
          <b style={{ color: lighten(def.roof) }}>{def.name}</b>
          <span style={{ color: MUTED }}>{agoText(m.at, now)}</span>
        </span>
        <div
          className="border-2 px-3 py-2 text-[14px] leading-snug"
          style={{ background: proposal ? '#2E2716' : question ? '#FFF3D6' : '#1C2E25', color: question ? INK : '#E9EEEA', borderColor: proposal || question ? SUN : 'rgba(0,0,0,.5)' }}
        >
          {(proposal || question) && (
            <div className="font-pixel mb-1.5 text-[8px] uppercase" style={{ color: question ? '#8A5A0B' : SUN }}>
              {question ? 'Fråga till dig' : `Förslag · ${m.status === 'väntar' ? 'väntar på ditt ja' : m.status}`}
            </div>
          )}
          <div className="whitespace-pre-line">{m.body}</div>
          {proposal && m.status === 'väntar' && (
            <>
              <div className="mt-2.5 flex gap-2">
                <PixelBtn onClick={() => onDecide(m, 'godkänd')} tone="ok">
                  <Check size={14} aria-hidden /> Godkänn
                </PixelBtn>
                <PixelBtn onClick={() => onDecide(m, 'avvisad')} tone="no">
                  <X size={14} aria-hidden /> Avvisa
                </PixelBtn>
              </div>
              <div className="mt-1.5 text-[11px]" style={{ color: MUTED }}>
                Godkänner du hamnar det i Att göra på Idag.
              </div>
            </>
          )}
          {question && <Question m={m} msgs={msgs} busy={busy} onAnswer={onAnswer} />}
        </div>
      </div>
    </div>
  );
}

function PixelBtn({ children, onClick, tone }: { children: ReactNode; onClick: () => void; tone: 'ok' | 'no' }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-[40px] items-center gap-1.5 border-2 px-3 text-[13px] font-semibold" style={{ background: tone === 'ok' ? MINT : 'transparent', color: tone === 'ok' ? INK : '#E9EEEA', borderColor: tone === 'ok' ? INK : LINE }}>
      {children}
    </button>
  );
}

/** Ljusare variant av husets takfärg, så att namnet syns mot den mörka bakgrunden. */
function lighten(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.55);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
