import { useEffect, useState, type ReactNode } from 'react';
import { LocalBackend } from '../data/local';
import { MemoryBackend } from '../data/memory';
import { Store, setStore } from '../data/store';
import type { Backend } from '../data/backend';
import { todayISO } from '../domain/dates';
import { generateQuests, settleGame, type Quest } from '../game/engine';
import { supabaseConfigured } from '../data/supabase-config';

export function toast(message: string, tone: 'ok' | 'xp' | 'error' = 'ok') {
  window.dispatchEvent(new CustomEvent('jarvis-toast', { detail: { message, tone } }));
}

export function deviceUser(): string {
  try {
    return localStorage.getItem('jarvis-user') || '';
  } catch {
    return '';
  }
}

export function setDeviceUser(name: string) {
  try {
    localStorage.setItem('jarvis-user', name);
  } catch {
    /* privat läge */
  }
}

let openQuests: Quest[] = [];

/** Spelet: när datan ändrats, se om något aktivt uppdrag blivit klart och dela ut XP. */
function settle(s: Store) {
  const ds = s.ds;
  if (!ds || !ds.settings.gameEnabled || !ds.settings.gameStartedAt) return;
  const today = todayISO();
  const g = settleGame(ds, openQuests, today);
  if (g) {
    const fresh = Object.entries(g.completed).filter(([k]) => !ds.game.completed[k]);
    const bosses = Object.keys(g.bossesBeaten).filter((k) => !ds.game.bossesBeaten[k]);
    void s.save('Uppdrag klart', () => [{ game: g }], { undoable: false }).then((ok) => {
      if (!ok) return;
      for (const [, c] of fresh) toast(`+${c.xp} XP · ${c.title}`, 'xp');
      if (bosses.length) toast('Boss besegrad! +300 XP', 'xp');
    });
  }
  const active = new Set(openQuests.filter((q) => !q.done).map((q) => q.id));
  openQuests = generateQuests(s.ds!, today, active).filter((q) => !q.done);
}

async function pickBackend(): Promise<{ backend: Backend; warning: string | null }> {
  if (supabaseConfigured()) {
    const { SupabaseBackend } = await import('../data/supabase');
    return { backend: await SupabaseBackend.connect(), warning: null };
  }
  if (await LocalBackend.available()) return { backend: new LocalBackend(), warning: null };
  return { backend: new MemoryBackend(), warning: 'Webbläsaren tillåter inte lagring här (t.ex. privat läge eller förhandsvisning). Det du gör sparas inte när sidan stängs.' };
}

export function Boot({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ ready: boolean; error: string | null; warning: string | null; login: boolean }>({ ready: false, error: null, warning: null, login: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { backend, warning } = await pickBackend();
        const s = new Store(backend, () => deviceUser() || 'Okänd');
        setStore(s);
        await s.init();
        // Daglig säkerhetskopia, en gång per dag
        try {
          const today = todayISO();
          const list = await backend.listBackups();
          if (s.ds && (s.ds.drops.length || s.ds.vouchers.length) && !list.some((b) => b.at.slice(0, 10) === today && b.note.startsWith('Daglig')))
            await backend.createBackup('Daglig kopia', s.ds);
        } catch {
          /* backup får aldrig stoppa appen */
        }
        if (s.ds) openQuests = generateQuests(s.ds, todayISO()).filter((q) => !q.done);
        s.afterCommit = settle;
        if (!cancelled) setState({ ready: true, error: null, warning, login: false });
      } catch (e) {
        const msg = (e as Error)?.message ?? 'okänt fel';
        if (!cancelled) setState({ ready: false, error: msg, warning: null, login: msg === 'LOGIN' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.login) return <LoginLazy />;
  if (state.error)
    return (
      <div className="mx-auto max-w-[480px] p-6">
        <h1 className="font-serif text-2xl font-semibold">Kunde inte starta</h1>
        <p className="text-muted">{state.error}</p>
        <p className="text-muted">Ingenting har sparats eller ändrats. Ladda om sidan för att försöka igen.</p>
        <button className="btn btn-primary" onClick={() => location.reload()}>
          Ladda om
        </button>
      </div>
    );
  if (!state.ready)
    return (
      <div className="grid min-h-dvh place-items-center bg-forest text-on-forest">
        <div className="flex flex-col items-center gap-2">
          <div className="font-serif text-3xl font-semibold">Jarvis</div>
          <div className="text-[13px] text-on-forest-muted">Hämtar din data…</div>
        </div>
      </div>
    );
  return (
    <>
      {state.warning && <div className="no-print bg-me-bg px-4 py-2 text-[13px] text-me">{state.warning}</div>}
      {children}
    </>
  );
}

function LoginLazy() {
  const [C, setC] = useState<null | (() => ReactNode)>(null);
  useEffect(() => {
    import('./screens/Login').then((m) => setC(() => m.Login));
  }, []);
  return C ? <>{C()}</> : null;
}
