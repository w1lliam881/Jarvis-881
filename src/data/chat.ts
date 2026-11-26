import { useCallback, useEffect, useState } from 'react';
import type { AgentMessage, ChatThread } from '../domain/agents';
import { store } from './store';

// Chatten med agenterna. Med Supabase ligger den i tabellen agent_messages (agenterna svarar när de jobbar).
// Utan Supabase (förhandsvisning) sparas den bara i den här webbläsaren så att man kan prova telefonen.
const LOCAL_KEY = 'jarvis-agent-chat';

function readLocal(): AgentMessage[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? sessionStorage.getItem(LOCAL_KEY) ?? '[]') as AgentMessage[];
  } catch {
    return [];
  }
}
function writeLocal(m: AgentMessage[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(m.slice(-300)));
  } catch {
    /* privat läge: bara i minnet */
  }
}

const SEEN_KEY = 'jarvis-chat-seen';
export function seenAt(thread: ChatThread): string | null {
  try {
    return (JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as Record<string, string>)[thread] ?? null;
  } catch {
    return null;
  }
}
export function markSeen(thread: ChatThread) {
  try {
    const all = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as Record<string, string>;
    all[thread] = new Date().toISOString();
    localStorage.setItem(SEEN_KEY, JSON.stringify(all));
  } catch {
    /* ingen lagring */
  }
}

export function useAgentChat() {
  const chat = store().backend.agentChat;
  const [msgs, setMsgs] = useState<AgentMessage[] | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    if (!chat) {
      setMsgs(readLocal());
      return;
    }
    try {
      setMsgs(await chat.list(400));
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setMsgs((m) => m ?? []);
    }
  }, [chat]);
  useEffect(() => {
    void load();
    const t = setInterval(() => document.visibilityState === 'visible' && void load(), 30000);
    return () => clearInterval(t);
  }, [load]);

  const send = async (thread: ChatThread, body: string): Promise<string | null> => {
    const text = body.trim();
    if (!text) return null;
    if (!chat) {
      const m: AgentMessage = { id: `local-${Date.now()}`, at: new Date().toISOString(), thread, sender: 'du', author: null, body: text, kind: 'chatt', status: null, replyTo: null };
      const next = [...readLocal(), m];
      writeLocal(next);
      setMsgs(next);
      return null;
    }
    try {
      await chat.send(thread, text);
      await load();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  };

  const decide = async (id: string, status: 'godkänd' | 'avvisad'): Promise<string | null> => {
    if (!chat) {
      const next = readLocal().map((m) => (m.id === id ? { ...m, status } : m));
      writeLocal(next);
      setMsgs(next);
      return null;
    }
    try {
      await chat.decide(id, status);
      await load();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  };

  return { msgs, err, reload: load, send, decide, shared: !!chat };
}
