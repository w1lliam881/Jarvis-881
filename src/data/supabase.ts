import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AgentRun } from '../domain/agents';
import { defaultGame, defaultSettings, emptyDataset } from '../domain/defaults';
import { COLLECTIONS, type ChangeLogEntry, type Dataset } from '../domain/types';
import { ConflictError, datasetCounts, validateMutations, type Backend, type BackupInfo, type Mutation, type PresenceInfo } from './backend';

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  // Tål adresser med snedstreck eller /rest/v1 på slutet
  client ??= createClient(String(import.meta.env.VITE_SUPABASE_URL).trim().replace(/\/(rest\/v1\/?)?$/, '').replace(/\/+$/, ''), String(import.meta.env.VITE_SUPABASE_ANON_KEY).trim(), {
    auth: { persistSession: true, detectSessionInUrl: true },
  });
  return client;
}

export async function sendMagicLink(email: string): Promise<string | null> {
  const { error } = await sb().auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: false } });
  if (!error) return null;
  if (error.status === 429 || /rate limit/i.test(error.message)) return 'För många inloggningsmejl på kort tid. Supabase skickar högst några i timmen. Vänta en stund och försök igen, eller använd länken i ett mejl du redan fått.';
  if (/signups not allowed|not found|otp_disabled/i.test(error.message) || error.status === 422) return 'Den här adressen har inte tillgång till Jarvis. Be den som äger appen att lägga till den.';
  return `Kunde inte skicka länken: ${error.message}`;
}

export async function signInWithPassword(email: string, password: string): Promise<string | null> {
  const { error } = await sb().auth.signInWithPassword({ email, password });
  if (!error) return null;
  if (error.status === 429 || /rate limit/i.test(error.message)) return 'För många försök. Vänta en stund och försök igen.';
  if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) return 'Fel e-post eller lösenord. Har du inte valt något lösenord än? Logga in med länken och välj ett under Mer → Inställningar.';
  return `Kunde inte logga in: ${error.message}`;
}

/** Väljer eller byter lösenord för den som är inloggad. */
export async function setPassword(password: string): Promise<string | null> {
  const { error } = await sb().auth.updateUser({ password });
  if (!error) return null;
  if (/different from the old/i.test(error.message)) return 'Det är samma lösenord som förut.';
  if (/weak|short|at least/i.test(error.message)) return 'Lösenordet är för svagt. Välj minst 8 tecken.';
  return `Kunde inte spara lösenordet: ${error.message}`;
}

export async function savePushSubscription(sub: PushSubscriptionJSON, prefs: { time: string; kinds: Record<string, boolean> }): Promise<string | null> {
  const { data } = await sb().auth.getSession();
  const email = data.session?.user.email ?? '';
  const { error } = await sb().from('push_subscriptions').upsert({ endpoint: sub.endpoint, email, subscription: sub, remind_at: prefs.time, kinds: prefs.kinds });
  return error ? `Kunde inte spara: ${error.message}` : null;
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await sb().from('push_subscriptions').delete().eq('endpoint', endpoint);
}

/** Är appen öppnad från hemskärmen (inte i Safari)? */
export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** Inloggningskod att föra över från Safari till appen på hemskärmen (en engångskod). */
export async function handoffCode(): Promise<string | null> {
  const { data } = await sb().auth.getSession();
  return data.session?.refresh_token ?? null;
}

/**
 * Safari glömmer sin inloggning lokalt efter att koden kopierats, utan att logga ut på servern.
 * Annars kan Safari senare förnya med samma kod, och Supabase loggar då ut även appen som skydd.
 */
export async function forgetLocalSession(): Promise<void> {
  await sb().auth.stopAutoRefresh();
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('sb-') && k.includes('auth-token')) localStorage.removeItem(k);
  } catch {
    /* privat läge */
  }
}

/** Logga in i appen med koden från Safari. */
export async function signInWithHandoff(code: string): Promise<string | null> {
  const { data, error } = await sb().auth.refreshSession({ refresh_token: code.trim() });
  if (error || !data.session) return 'Koden fungerade inte. Den kan bara användas en gång: tryck på länken i mejlet igen för en ny kod.';
  return null;
}

interface RecordRow {
  collection: string;
  id: string;
  data: Record<string, unknown>;
  version: number;
}

/** Lagring i Supabase (Postgres i EU). Samma regler som lokalt, plus databasens egna kontroller. */
export class SupabaseBackend implements Backend {
  readonly kind = 'supabase' as const;
  readonly durable = true;
  private listeners = new Set<() => void>();
  private myWrites = 0;

  email = '';

  static async connect(): Promise<SupabaseBackend> {
    const { data } = await sb().auth.getSession();
    if (!data.session) throw new Error('LOGIN');
    const b = new SupabaseBackend();
    b.email = data.session.user.email ?? '';
    sb()
      .channel('records')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, () => {
        if (Date.now() - b.myWrites > 3000) b.listeners.forEach((l) => l());
      })
      .subscribe();
    return b;
  }

  async load(): Promise<Dataset> {
    const ds = emptyDataset();
    const rows: RecordRow[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb().from('records').select('collection,id,data,version').range(from, from + 999);
      if (error) throw new Error(`Kunde inte läsa data: ${error.message}`);
      rows.push(...(data as RecordRow[]));
      if (!data || data.length < 1000) break;
    }
    for (const r of rows) {
      if (r.collection === 'meta') {
        if (r.id === 'settings') ds.settings = { ...defaultSettings(), ...(r.data as object), id: 'main' } as Dataset['settings'];
        if (r.id === 'game') ds.game = { ...defaultGame(), ...(r.data as object), id: 'main' } as Dataset['game'];
      } else (ds as unknown as Record<string, unknown[]>)[r.collection]?.push(r.data);
    }
    for (const c of COLLECTIONS) (ds[c] as { createdAt: string }[]).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    return ds;
  }

  async commit(mutations: Mutation[], log: ChangeLogEntry[]): Promise<void> {
    validateMutations(mutations);
    const muts = mutations.map((m) =>
      m.kind === 'put'
        ? { collection: m.collection, record: m.record, expectedVersion: m.expectedVersion }
        : { collection: 'meta', record: { ...m.record, id: m.kind }, expectedVersion: m.expectedVersion },
    );
    this.myWrites = Date.now();
    const { error } = await sb().rpc('commit_mutations', { muts, log });
    if (error) {
      if (error.code === 'PT409' || error.code === '40001' || /Konflikt/.test(error.message)) throw new ConflictError('samma post');
      throw new Error(error.message);
    }
  }

  /** Närvaro: vem som har appen öppen just nu, och när var och en senast var aktiv. */
  // En gemensam anslutning för närvaro, hur många delar av appen som än visar den.
  // (Supabase tillåter bara en prenumeration per kanal; två startade samtidigt kraschade appen.)
  private presenceListeners = new Set<(list: PresenceInfo[]) => void>();
  private presenceLast: PresenceInfo[] | null = null;
  private presenceStop: (() => void) | null = null;

  presence = (cb: (list: PresenceInfo[]) => void): (() => void) => {
    this.presenceListeners.add(cb);
    if (this.presenceLast) cb(this.presenceLast);
    if (!this.presenceStop) {
      this.presenceStop = this.startPresence((list) => {
        this.presenceLast = list;
        for (const l of this.presenceListeners) l(list);
      });
    }
    return () => {
      this.presenceListeners.delete(cb);
      if (!this.presenceListeners.size && this.presenceStop) {
        this.presenceStop();
        this.presenceStop = null;
        this.presenceLast = null;
      }
    };
  };

  private startPresence(cb: (list: PresenceInfo[]) => void): () => void {
    const me = this.email.toLowerCase();
    let online = new Set<string>();
    let people: { email: string; name: string }[] = [];
    let seen: Record<string, string> = {};
    const emit = () =>
      cb(
        (people.length ? people : [{ email: me, name: me }]).map((p) => {
          const e = p.email.toLowerCase();
          return { user: e, name: p.name || e, online: online.has(e) || e === me, lastSeen: seen[e] ?? null, me: e === me };
        }),
      );
    const refresh = async () => {
      const [u, s] = await Promise.all([sb().from('allowed_users').select('email,name'), sb().from('presence').select('email,last_seen')]);
      people = (u.data ?? []) as { email: string; name: string }[];
      seen = Object.fromEntries(((s.data ?? []) as { email: string; last_seen: string }[]).map((r) => [r.email.toLowerCase(), r.last_seen]));
      emit();
    };
    const beat = () => {
      if (document.visibilityState === 'visible') void sb().from('presence').upsert({ email: me, last_seen: new Date().toISOString() });
    };
    const ch = sb().channel('online', { config: { presence: { key: me } } });
    ch.on('presence', { event: 'sync' }, () => {
      online = new Set(Object.keys(ch.presenceState()).map((k) => k.toLowerCase()));
      void refresh();
    }).subscribe((status) => {
      if (status === 'SUBSCRIBED') void ch.track({ at: new Date().toISOString() });
    });
    beat();
    const t = setInterval(beat, 60000);
    const vis = () => {
      beat();
      if (document.visibilityState === 'visible') void ch.track({ at: new Date().toISOString() });
      else void ch.untrack();
    };
    document.addEventListener('visibilitychange', vis);
    void refresh();
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', vis);
      void sb().removeChannel(ch);
    };
  }

  onRemoteChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  agentRuns = async (limit: number): Promise<AgentRun[]> => {
    const { data, error } = await sb().from('agent_runs').select('*').order('at', { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({ ...r, highlights: Array.isArray(r.highlights) ? r.highlights : [] })) as AgentRun[];
  };

  async changelog(limit: number): Promise<ChangeLogEntry[]> {
    const { data } = await sb().from('changelog').select('*').order('at', { ascending: false }).limit(limit);
    return (data ?? []).map((r) => ({ ...r, recordId: r.record_id })) as ChangeLogEntry[];
  }

  async putBlob(key: string, blob: Blob): Promise<void> {
    const { error } = await sb().storage.from('underlag').upload(key, blob, { upsert: true, contentType: blob.type });
    if (error) throw new Error(`Filen kunde inte laddas upp: ${error.message}`);
  }

  async getBlob(key: string): Promise<Blob | null> {
    const { data } = await sb().storage.from('underlag').download(key);
    return data ?? null;
  }

  async listBackups(): Promise<BackupInfo[]> {
    const { data } = await sb().from('backups').select('id,at,note,counts').order('at', { ascending: false }).limit(60);
    return (data ?? []) as BackupInfo[];
  }

  async createBackup(note: string, d: Dataset): Promise<BackupInfo> {
    const at = new Date().toISOString();
    const info = { id: `${at.slice(0, 19).replace(/[:T]/g, '-')}`, at, note, counts: datasetCounts(d) };
    const { error } = await sb().from('backups').insert({ ...info, data: d });
    if (error) throw new Error(error.message);
    return info;
  }

  async readBackup(id: string): Promise<Dataset | null> {
    const { data } = await sb().from('backups').select('data').eq('id', id).single();
    if (!data) return null;
    const d = data.data as Dataset | { collection: string; data: unknown }[];
    if (Array.isArray(d)) {
      const ds = emptyDataset();
      for (const r of d) {
        if (r.collection === 'meta') {
          const m = r.data as { id?: string };
          if (m.id === 'settings') ds.settings = { ...defaultSettings(), ...(r.data as object), id: 'main' } as Dataset['settings'];
          if (m.id === 'game') ds.game = { ...defaultGame(), ...(r.data as object), id: 'main' } as Dataset['game'];
        } else (ds as unknown as Record<string, unknown[]>)[r.collection]?.push(r.data);
      }
      return ds;
    }
    return d;
  }

  async replaceAll(d: Dataset, note: string): Promise<void> {
    await this.createBackup(`Före ${note}`, await this.load());
    const rows = [
      ...COLLECTIONS.flatMap((c) => (d[c] as unknown as { id: string; version: number; deletedAt?: string | null; updatedBy?: string }[]).map((r) => ({ collection: c, id: r.id, data: r, version: r.version, updated_by: r.updatedBy ?? null, deleted_at: r.deletedAt ?? null }))),
      { collection: 'meta', id: 'settings', data: { ...d.settings, id: 'settings' }, version: d.settings.version, updated_by: null, deleted_at: null },
      { collection: 'meta', id: 'game', data: { ...d.game, id: 'game' }, version: d.game.version, updated_by: null, deleted_at: null },
    ];
    // Kontrollera först, så att databasen aldrig töms för att en post sedan stoppas
    validateMutations(COLLECTIONS.flatMap((c) => (d[c] as unknown as { id: string; version: number }[]).map((record) => ({ kind: 'put' as const, collection: c, record, expectedVersion: null }))));
    this.myWrites = Date.now();
    const { error } = await sb().rpc('replace_all', { rows });
    if (error) throw new Error(`Ingenting ändrades: ${error.message}`);
  }
}
