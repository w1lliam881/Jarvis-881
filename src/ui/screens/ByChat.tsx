// Chatten i Agentbyn: telefonen i varje hus och byns gruppchatt. Spelkänsla med pixlar, samma färger som byn.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Send, Smartphone, X } from 'lucide-react';
import { markSeen, seenAt, useAgentChat } from '../../data/chat';
import { AGENTS, CHAT_SCHEDULE, agentById, agoText, dmThread, nextRun, pendingProposals, stockholmParts, threadMessages, unanswered, unreadCount, whenText, type AgentDef, type AgentMessage, type AgentRun, type ChatThread } from '../../domain/agents';
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

/** En rad i telefonen: ett chattmeddelande eller ett jobb agenten har gjort (från agent_runs). */
type Line = { key: string; at: string; mine: boolean; kind: 'chatt' | 'plan' | 'förslag' | 'jobb'; title?: string; body: string; status?: AgentMessage['status'] };

function linesFor(def: AgentDef, msgs: AgentMessage[], runs: AgentRun[]): Line[] {
  const t = dmThread(def.id);
  const out: Line[] = threadMessages(msgs, t).map((m) => ({ key: m.id, at: m.at, mine: m.sender === 'du', kind: m.kind, body: m.body, status: m.status }));
  for (const r of runs.slice(0, 6)) out.push({ key: `run-${r.id}`, at: r.at, mine: false, kind: 'jobb', title: r.title, body: r.summary });
  return out.sort((a, b) => (a.at < b.at ? -1 : 1));
}

const QUICK = ['Vad har du jobbat med idag?', 'Vad är planen för idag?', 'Vad är planen för veckan?', 'Vad tycker du att jag ska göra nu?'];

/** Knappen i huset som fäller upp telefonen. */
export function PhoneButton({ def, runs, xmas }: { def: AgentDef; runs: AgentRun[]; xmas: boolean }) {
  const chat = useAgentChat();
  const [open, setOpen] = useState(false);
  const thread = dmThread(def.id);
  const [seen, setSeen] = useState(() => seenAt(thread));
  const unread = chat.msgs ? unreadCount(chat.msgs, thread, seen) : 0;
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
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const now = new Date();
  const thread: ChatThread = dmThread(def.id);
  const lines = useMemo(() => linesFor(def, chat.msgs ?? [], runs), [def, chat.msgs, runs]);
  const waiting = chat.msgs ? unanswered(chat.msgs, thread).length : 0;
  const nextReply = nextRun(CHAT_SCHEDULE, now);
  const p = stockholmParts(now);
  const clock = `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`;

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [lines.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && drop();
    // Bakåtknappen eller en länk: lägg ner telefonen direkt
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
  }, []);

  const drop = () => {
    setLeaving(true);
    setTimeout(onClose, 220);
  };
  const send = async (body: string) => {
    if (!body.trim() || busy) return;
    setBusy(true);
    const err = await chat.send(thread, body);
    setBusy(false);
    if (err) toast(err, 'error');
    else setText('');
  };

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center lg:items-center" role="dialog" aria-modal="true" aria-label={`Telefonen: chatt med ${def.name}`}>
      <button type="button" aria-label="Stäng telefonen" tabIndex={-1} className="fade-in absolute inset-0 bg-black/55" onClick={drop} />
      <div
        className={cx('relative flex h-[min(88dvh,760px)] w-[min(100%,420px)] flex-col border-[6px] p-2.5 pb-3', leaving ? 'phone-down' : 'phone-up')}
        style={{ background: '#1A1F1C', borderColor: '#0A0D0B', boxShadow: '0 0 0 3px #3A4540, 8px 8px 0 rgba(0,0,0,.45)', borderRadius: 26 }}
      >
        {/* högtalare och kamera */}
        <div className="mx-auto mb-2 flex h-4 items-center gap-2" aria-hidden>
          <i className="block h-1.5 w-12" style={{ background: '#3A4540' }} />
          <i className="block h-2 w-2" style={{ background: '#3A4540' }} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ background: '#0E1F18', borderRadius: 12 }}>
          {/* statusrad */}
          <div className="font-pixel flex items-center justify-between px-3 pt-2 text-[8px]" style={{ color: MUTED }}>
            <span>{clock}</span>
            <span className="flex items-center gap-1" aria-hidden>
              <i className="block h-1.5 w-1" style={{ background: MUTED }} />
              <i className="block h-2 w-1" style={{ background: MUTED }} />
              <i className="block h-2.5 w-1" style={{ background: MUTED }} />
              <i className="ml-1 block h-2 w-4 border" style={{ borderColor: MUTED, background: `linear-gradient(90deg, ${MINT} 70%, transparent 70%)` }} />
            </span>
          </div>
          {/* rubrik */}
          <div className="flex items-center gap-3 border-b-2 px-3 py-2.5" style={{ borderColor: LINE, background: xmas ? 'rgba(194,50,74,.22)' : 'rgba(0,0,0,.25)' }}>
            <span className="grid h-11 w-11 shrink-0 place-items-center border-2" style={{ background: def.wall, borderColor: INK }}>
              <AgentSprite def={def} size={34} xmas={xmas} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-[#E9EEEA]">{def.name}</span>
              <span className="block text-[11px]" style={{ color: MUTED }}>
                {def.house} · {waiting ? `svarar ${nextReply ? whenText(nextReply, now) : 'snart'}` : 'svarar varannan timme 08–22'}
              </span>
            </span>
            <button type="button" onClick={drop} className="grid h-10 w-10 place-items-center border-2 text-[#E9EEEA]" style={{ borderColor: LINE }} aria-label="Lägg ner telefonen">
              <ChevronDown size={18} aria-hidden />
            </button>
          </div>

          {/* meddelanden */}
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
                Skriv vad du undrar. {def.name} läser och svarar nästa gång agenterna går sin runda, varannan timme mellan 08 och 22.
              </div>
            )}
            {lines.map((l) => (
              <Bubble key={l.key} l={l} def={def} now={now} />
            ))}
            {waiting > 0 && (
              <div className="font-pixel self-start px-1 text-[8px]" style={{ color: MUTED }}>
                Väntar på svar · {def.name} svarar {nextReply ? whenText(nextReply, now) : 'snart'}
              </div>
            )}
          </div>

          {/* snabbval */}
          <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
            {QUICK.map((q) => (
              <button key={q} type="button" disabled={busy} onClick={() => void send(q)} className="shrink-0 border-2 px-2 py-1.5 text-[12px] text-[#E9EEEA]" style={{ borderColor: LINE, background: 'rgba(255,255,255,.04)' }}>
                {q}
              </button>
            ))}
          </div>
          <form
            className="flex items-center gap-2 border-t-2 p-2.5"
            style={{ borderColor: LINE }}
            onSubmit={(e) => {
              e.preventDefault();
              void send(text);
            }}
          >
            <input
              className="min-w-0 flex-1 border-2 px-3 py-2 text-[16px] text-[#E9EEEA] outline-none placeholder:text-[#7F8C85]"
              style={{ background: '#0A1712', borderColor: LINE }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Skriv till ${def.name}…`}
              aria-label={`Meddelande till ${def.name}`}
              maxLength={2000}
            />
            <button type="submit" disabled={busy || !text.trim()} className="grid h-11 w-11 shrink-0 place-items-center border-2 disabled:opacity-50" style={{ background: SUN, color: INK, borderColor: INK }} aria-label="Skicka">
              <Send size={17} aria-hidden />
            </button>
          </form>
        </div>
        {/* hemknapp */}
        <button type="button" onClick={drop} className="mx-auto mt-2 block h-1.5 w-24" style={{ background: '#3A4540', borderRadius: 4 }} aria-label="Lägg ner telefonen" />
      </div>
    </div>,
    document.body,
  );
}

function Bubble({ l, def, now }: { l: Line; def: AgentDef; now: Date }) {
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
  const tag = l.kind === 'jobb' ? 'Jobbade med' : l.kind === 'plan' ? 'Planen' : l.kind === 'förslag' ? 'Förslag' : null;
  return (
    <div className="flex max-w-[88%] items-end gap-1.5 self-start">
      <span className="mb-4 grid h-7 w-7 shrink-0 place-items-center" style={{ background: def.wall }}>
        <AgentSprite def={def} size={22} />
      </span>
      <div className="flex min-w-0 flex-col">
        <div className="border-2 px-3 py-2 text-[14px] leading-snug" style={{ background: l.kind === 'jobb' ? '#24372E' : CREAM, color: l.kind === 'jobb' ? '#E9EEEA' : INK, borderColor: INK, boxShadow: `2px 2px 0 ${INK}` }}>
          {tag && (
            <div className="font-pixel mb-1 text-[8px] uppercase" style={{ color: l.kind === 'jobb' ? SUN : RED }}>
              {tag}
              {l.status && l.status !== 'väntar' ? ` · ${l.status}` : ''}
            </div>
          )}
          {l.title && <div className="font-semibold">{l.title}</div>}
          <div className="whitespace-pre-line">{l.body}</div>
        </div>
        <span className="mt-0.5 text-[10px]" style={{ color: MUTED }}>
          {agoText(l.at, now)}
        </span>
      </div>
    </div>
  );
}

// ---------- Gruppchatten i byn ----------

export function GroupChat({ xmas }: { xmas: boolean }) {
  const chat = useAgentChat();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [all, setAll] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const now = new Date();
  const msgs = useMemo(() => threadMessages(chat.msgs ?? [], 'grupp'), [chat.msgs]);
  const pending = pendingProposals(chat.msgs ?? []);
  const shown = all ? msgs : msgs.slice(-30);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [msgs.length]);

  const decide = async (id: string, s: 'godkänd' | 'avvisad') => {
    const err = await chat.decide(id, s);
    toast(err ?? (s === 'godkänd' ? 'Godkänt. Agenterna ser det nästa runda.' : 'Avvisat.'), err ? 'error' : 'ok');
  };

  return (
    <section className="flex flex-col gap-2.5" aria-label="Byrådet, agenternas gruppchatt">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-pixel m-0 text-[12px] leading-relaxed" style={{ color: xmas ? '#FF8A8A' : SUN }}>
            Byrådet
          </h2>
          <p className="m-0 mt-1 text-[12px]" style={{ color: MUTED }}>
            Agenternas gruppchatt. De pushar och tränar varandra här. Inget görs utan ditt ja.
          </p>
        </div>
        {pending.length > 0 && (
          <span className="font-pixel shrink-0 border-2 px-2 py-1 text-[9px]" style={{ borderColor: SUN, color: SUN }}>
            {pending.length} väntar på dig
          </span>
        )}
      </div>

      <div className="flex flex-col border-2" style={{ borderColor: xmas ? 'rgba(194,50,74,.55)' : LINE, background: 'rgba(0,0,0,.22)' }}>
        <div ref={list} className="flex max-h-[520px] min-h-[180px] flex-col gap-2.5 overflow-y-auto p-3">
          {chat.err && <p className="m-0 text-[12px] text-[#F4A08F]">{chat.err}</p>}
          {msgs.length > shown.length && (
            <button type="button" onClick={() => setAll(true)} className="self-center text-[12px] underline" style={{ color: MUTED }}>
              Visa äldre ({msgs.length - shown.length})
            </button>
          )}
          {!msgs.length && !chat.err && (
            <p className="m-auto max-w-[360px] text-center text-[13px]" style={{ color: MUTED }}>
              {chat.msgs == null ? 'Hämtar…' : 'Tyst i byrådet än. Agenterna samlas varje dag vid lunch och efter sina jobb, och skriver här vad de ser och vill göra.'}
            </p>
          )}
          {shown.map((m) => (
            <GroupLine key={m.id} m={m} now={now} onDecide={decide} />
          ))}
        </div>
        <form
          className="flex items-center gap-2 border-t-2 p-2.5"
          style={{ borderColor: LINE }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim()) return;
            setBusy(true);
            const err = await chat.send('grupp', text);
            setBusy(false);
            if (err) toast(err, 'error');
            else setText('');
          }}
        >
          <input
            className="min-w-0 flex-1 border-2 px-3 py-2 text-[16px] text-[#E9EEEA] outline-none placeholder:text-[#7F8C85]"
            style={{ background: '#0A1712', borderColor: LINE }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Skriv till alla agenter…"
            aria-label="Meddelande till byrådet"
            maxLength={2000}
          />
          <button type="submit" disabled={busy || !text.trim()} className="grid h-11 w-11 shrink-0 place-items-center border-2 disabled:opacity-50" style={{ background: SUN, color: INK, borderColor: INK }} aria-label="Skicka till alla">
            <Send size={17} aria-hidden />
          </button>
        </form>
      </div>
    </section>
  );
}

function GroupLine({ m, now, onDecide }: { m: AgentMessage; now: Date; onDecide: (id: string, s: 'godkänd' | 'avvisad') => void }) {
  if (m.sender === 'du')
    return (
      <div className="flex max-w-[85%] flex-col items-end self-end">
        <span className="mb-0.5 text-[11px] font-semibold" style={{ color: MINT }}>
          Du
        </span>
        <div className="border-2 px-3 py-2 text-[14px] leading-snug" style={{ background: MINT, color: INK, borderColor: INK }}>
          {m.body}
        </div>
        <span className="mt-0.5 text-[10px]" style={{ color: MUTED }}>
          {agoText(m.at, now)}
        </span>
      </div>
    );
  const def = agentById(m.sender) ?? AGENTS[0];
  const proposal = m.kind === 'förslag';
  return (
    <div className="flex max-w-[92%] items-start gap-2 self-start">
      <a href={`#/byn/${def.id}`} className="grid h-9 w-9 shrink-0 place-items-center" style={{ background: def.wall }} aria-label={`Gå till ${def.house}`}>
        <AgentSprite def={def} size={28} />
      </a>
      <div className="flex min-w-0 flex-col">
        <span className="mb-0.5 flex items-baseline gap-2 text-[11px]">
          <b style={{ color: lighten(def.roof) }}>{def.name}</b>
          <span style={{ color: MUTED }}>{agoText(m.at, now)}</span>
        </span>
        <div className="border-2 px-3 py-2 text-[14px] leading-snug" style={{ background: proposal ? '#2E2716' : '#1C2E25', color: '#E9EEEA', borderColor: proposal ? SUN : 'rgba(0,0,0,.5)' }}>
          {proposal && (
            <div className="font-pixel mb-1.5 text-[8px] uppercase" style={{ color: SUN }}>
              Förslag · {m.status === 'väntar' ? 'väntar på ditt ja' : m.status}
            </div>
          )}
          <div className="whitespace-pre-line">{m.body}</div>
          {proposal && m.status === 'väntar' && (
            <div className="mt-2.5 flex gap-2">
              <PixelBtn onClick={() => onDecide(m.id, 'godkänd')} tone="ok">
                <Check size={14} aria-hidden /> Godkänn
              </PixelBtn>
              <PixelBtn onClick={() => onDecide(m.id, 'avvisad')} tone="no">
                <X size={14} aria-hidden /> Avvisa
              </PixelBtn>
            </div>
          )}
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
