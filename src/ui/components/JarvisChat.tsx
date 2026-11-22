import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Check, RotateCcw, Sparkles, X } from 'lucide-react';
import { store } from '../../data/store';
import { addTask, bookEvent, sellItem } from '../../data/actions';
import { askJarvis, logAi } from '../../data/supabase';
import { ACTION_TOOLS, runReadTool } from '../../ai/tools';
import { todayISO } from '../../domain/dates';
import { EVENT_TYPES } from '../../domain/ledger';
import { kr, toOre } from '../../domain/money';
import type { EventType, Platform } from '../../domain/types';
import { Sheet, cx } from './ui';
import { toast } from '../Boot';

interface Block {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}
type ApiMessage = { role: 'user' | 'assistant'; content: unknown };
interface Proposal {
  toolId: string;
  name: string;
  input: Record<string, unknown>;
  state: 'väntar' | 'godkänd' | 'avböjd' | 'fel';
}

// Konversationen ligger kvar medan appen är öppen, även om bladet stängs
let convo: ApiMessage[] = [];
let shown: { role: 'user' | 'assistant'; text: string }[] = [];

const EXAMPLES = ['Vad sålde bäst i november?', 'Vilka plagg borde jag publicera om?', 'Vilka märken ska jag köpa mer av?', 'Hur går Paket 2 jämfört med Paket 1?'];

export function JarvisChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState(shown);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [pendingResults, setPendingResults] = useState<{ type: 'tool_result'; tool_use_id: string; content: string }[]>([]);
  const [cost, setCost] = useState<{ spent: number; cap: number } | null>(null);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [messages, proposals, busy]);
  const push = (m: { role: 'user' | 'assistant'; text: string }) => {
    shown = [...shown, m];
    setMessages(shown);
  };

  /** Kör konversationen tills Claude är klar eller väntar på att du godkänner något. */
  const run = async () => {
    setBusy(true);
    setError('');
    for (let i = 0; i < 8; i++) {
      const r = await askJarvis(convo);
      if (r.spent_ore != null && r.cap_ore != null) setCost({ spent: r.spent_ore, cap: r.cap_ore });
      if (r.error || !r.content) {
        setError(r.error ?? 'Jarvis svarade inte.');
        // Ta bort den obesvarade frågan så att samtalet kan fortsätta
        if (convo.at(-1)?.role === 'user' && typeof convo.at(-1)?.content === 'string') convo = convo.slice(0, -1);
        break;
      }
      const content = r.content as Block[];
      convo = [...convo, { role: 'assistant', content }];
      const text = content.filter((b) => b.type === 'text' && b.text).map((b) => b.text).join('\n\n');
      if (text) push({ role: 'assistant', text });
      if (r.stop_reason === 'refusal') {
        push({ role: 'assistant', text: 'Det kan jag inte hjälpa till med.' });
        break;
      }
      const uses = content.filter((b) => b.type === 'tool_use');
      if (r.stop_reason !== 'tool_use' || !uses.length) break;

      const ds = store().ds!;
      const results: { type: 'tool_result'; tool_use_id: string; content: string }[] = [];
      const props: Proposal[] = [];
      for (const u of uses) {
        const inp = (u.input ?? {}) as Record<string, unknown>;
        if (ACTION_TOOLS.has(u.name!)) props.push({ toolId: u.id!, name: u.name!, input: inp, state: 'väntar' });
        else if (u.name === 'suggest_items') {
          const ids = Array.isArray(inp.item_ids) ? (inp.item_ids as string[]) : [];
          void logAi('förslag', ids, String(inp.reason ?? '')).catch(() => {});
          results.push({ type: 'tool_result', tool_use_id: u.id!, content: 'Registrerat.' });
        } else results.push({ type: 'tool_result', tool_use_id: u.id!, content: JSON.stringify(runReadTool(u.name!, inp, ds, todayISO())) });
      }
      if (props.length) {
        // Vänta på att du godkänner eller avböjer innan svaren skickas tillbaka
        setProposals(props);
        setPendingResults(results);
        break;
      }
      convo = [...convo, { role: 'user', content: results }];
    }
    setBusy(false);
  };

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy || proposals.some((p) => p.state === 'väntar')) return;
    setInput('');
    push({ role: 'user', text: t });
    convo = [...convo, { role: 'user', content: t }];
    await run();
  };

  const decide = async (p: Proposal, approve: boolean) => {
    let state: Proposal['state'] = approve ? 'godkänd' : 'avböjd';
    if (approve) {
      const i = p.input;
      let ok = false;
      if (p.name === 'propose_sale') ok = await sellItem(String(i.item_id), toOre(Number(i.price_kr)), String(i.date), String(i.platform) as Platform);
      else if (p.name === 'propose_cost') ok = await bookEvent({ type: String(i.type) as EventType, amount: toOre(Number(i.amount_kr)), date: String(i.date), text: String(i.text ?? '') });
      else if (p.name === 'propose_task') ok = await addTask(String(i.title), String(i.date));
      if (!ok) state = 'fel';
      else void logAi('godkänd', p.name === 'propose_sale' ? [String(i.item_id)] : [], describe(p)).catch(() => {});
    }
    const next = proposals.map((x) => (x.toolId === p.toolId ? { ...x, state } : x));
    setProposals(next);
    if (next.every((x) => x.state !== 'väntar')) {
      const results = [
        ...pendingResults,
        ...next.map((x) => ({
          type: 'tool_result' as const,
          tool_use_id: x.toolId,
          content: x.state === 'godkänd' ? 'Användaren godkände. Sparat.' : x.state === 'fel' ? 'Kunde inte sparas (t.ex. plagget fanns inte).' : 'Användaren avböjde.',
        })),
      ];
      convo = [...convo, { role: 'user', content: results }];
      setPendingResults([]);
      setProposals([]);
      await run();
    }
  };

  const reset = () => {
    convo = [];
    shown = [];
    setMessages([]);
    setProposals([]);
    setError('');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Fråga Jarvis"
      footer={
        <div className="mb-1 flex flex-col gap-1.5">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <textarea
              className="field min-h-[44px] flex-1 resize-none py-2.5"
              rows={1}
              value={input}
              placeholder="Skriv en fråga…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              aria-label="Fråga till Jarvis"
            />
            <button type="submit" className="btn btn-primary h-11 w-11 shrink-0 px-0" disabled={!input.trim() || busy} aria-label="Skicka">
              <ArrowUp size={18} aria-hidden />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>{cost ? `Denna månad: ${kr(cost.spent, { decimals: true })} av ${kr(cost.cap)}` : 'Claude Sonnet 5.5 · tak 50 kr/mån'}</span>
            {messages.length > 0 && (
              <button type="button" className="flex items-center gap-1" onClick={reset}>
                <RotateCcw size={12} aria-hidden /> Ny konversation
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3 pb-2">
        {!messages.length && (
          <div className="flex flex-col gap-2">
            <p className="m-0 text-[14px] text-muted">Fråga om din försäljning, ditt lager eller vad du ska köpa. Jarvis kan också föreslå att lägga in saker, men inget sparas utan att du godkänner.</p>
            {EXAMPLES.map((e) => (
              <button key={e} type="button" className="rounded-xl border border-line px-3 py-2.5 text-left text-[14px] active:bg-surface-2" onClick={() => void send(e)}>
                {e}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cx('max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed', m.role === 'user' ? 'self-end bg-forest text-on-forest' : 'self-start bg-surface-2')}>
            {m.text}
          </div>
        ))}
        {proposals.map((p) => (
          <div key={p.toolId} className="card flex flex-col gap-2 border-sun p-3">
            <div className="text-[12px] font-semibold text-me">Förslag från Jarvis</div>
            <div className="text-[15px]">{describe(p)}</div>
            {p.state === 'väntar' ? (
              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost flex-1" onClick={() => void decide(p, false)}>
                  <X size={16} aria-hidden /> Avböj
                </button>
                <button type="button" className="btn btn-primary flex-1" onClick={() => void decide(p, true)}>
                  <Check size={16} aria-hidden /> Godkänn
                </button>
              </div>
            ) : (
              <div className={cx('text-[13px]', p.state === 'godkänd' ? 'text-pos' : 'text-muted')}>{p.state === 'godkänd' ? 'Godkänd och sparad' : p.state === 'fel' ? 'Kunde inte sparas' : 'Avböjd'}</div>
            )}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 self-start rounded-2xl bg-surface-2 px-3.5 py-2.5 text-[14px] text-muted">
            <Sparkles size={14} className="animate-pulse" aria-hidden /> Jarvis tänker…
          </div>
        )}
        {error && <div className="rounded-xl bg-hi-bg px-3 py-2 text-[14px] text-hi">{error}</div>}
        <div ref={end} />
      </div>
    </Sheet>
  );
}

function describe(p: Proposal): string {
  const i = p.input;
  if (p.name === 'propose_sale') {
    const it = store().ds?.items.find((x) => x.id === i.item_id);
    return `Registrera försäljning: ${it ? `${it.name}${it.productId ? ` (${it.productId})` : ''}` : 'okänt plagg'} för ${i.price_kr} kr på ${i.platform}, ${i.date}.`;
  }
  if (p.name === 'propose_cost') return `Bokför ${EVENT_TYPES[String(i.type) as EventType]?.label.toLowerCase() ?? i.type}: ${i.amount_kr} kr, ${i.date}${i.text ? ` (${i.text})` : ''}.`;
  if (p.name === 'propose_task') return `Lägg till uppgift: ${i.title} (${i.date}).`;
  return p.name;
}

/** Är chatten tillgänglig (Supabase krävs eftersom nyckeln ligger på servern)? */
export function chatAvailable(): boolean {
  return store().backend.kind === 'supabase';
}

export function useChatToast() {
  return () => toast('Jarvis-chatten kräver den publicerade appen.');
}
