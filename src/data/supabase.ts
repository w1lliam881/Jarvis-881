import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { defaultGame, defaultSettings, emptyDataset } from '../domain/defaults';
import { COLLECTIONS, type ChangeLogEntry, type Dataset } from '../domain/types';
import { ConflictError, datasetCounts, validateMutations, type Backend, type BackupInfo, type Mutation } from './backend';

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  client ??= createClient(import.meta.env.VITE_SUPABASE_URL as string, import.meta.env.VITE_SUPABASE_ANON_KEY as string, {
    auth: { persistSession: true, detectSessionInUrl: true },
  });
  return client;
}

export async function sendMagicLink(email: string): Promise<string | null> {
  const { error } = await sb().auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: false } });
  return error ? 'Kunde inte skicka länken. Är adressen tillagd som användare?' : null;
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

  static async connect(): Promise<SupabaseBackend> {
    const { data } = await sb().auth.getSession();
    if (!data.session) throw new Error('LOGIN');
    const b = new SupabaseBackend();
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
      if (error.code === '40001' || /Konflikt/.test(error.message)) throw new ConflictError('samma post');
      throw new Error(error.message);
    }
  }

  onRemoteChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

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
