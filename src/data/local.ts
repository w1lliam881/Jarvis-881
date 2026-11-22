import Dexie, { type Table } from 'dexie';
import { defaultGame, defaultSettings, emptyDataset } from '../domain/defaults';
import { COLLECTIONS, type ChangeLogEntry, type Dataset } from '../domain/types';
import { ConflictError, datasetCounts, validateMutations, type Backend, type BackupInfo, type Mutation } from './backend';

interface Row {
  id: string;
  version: number;
  [k: string]: unknown;
}

class JarvisDB extends Dexie {
  records!: Table<Row & { c: string; k: string }, string>;
  meta!: Table<Row, string>;
  changelog!: Table<ChangeLogEntry, string>;
  blobs!: Table<{ key: string; blob: Blob }, string>;
  backups!: Table<BackupInfo & { data: string }, string>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({
      records: 'k, c',
      meta: 'id',
      changelog: 'id, at',
      blobs: 'key',
      backups: 'id, at',
    });
  }
}

const keyOf = (c: string, id: string) => `${c}/${id}`;

/** Lagring i webbläsarens IndexedDB. Fungerar offline. Används tills Supabase är uppsatt. */
export class LocalBackend implements Backend {
  readonly kind = 'local' as const;
  readonly durable = true;
  private db: JarvisDB;
  private channel: BroadcastChannel | null;
  private listeners = new Set<() => void>();

  constructor(name = 'jarvis-881') {
    this.db = new JarvisDB(name);
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`${name}-changes`) : null;
    this.channel?.addEventListener('message', () => this.listeners.forEach((l) => l()));
  }

  static async available(): Promise<boolean> {
    try {
      if (typeof indexedDB === 'undefined') return false;
      const db = new Dexie('jarvis-probe');
      db.version(1).stores({ t: 'id' });
      await db.open();
      db.close();
      return true;
    } catch {
      return false;
    }
  }

  async load(): Promise<Dataset> {
    const ds = emptyDataset();
    const rows = await this.db.records.toArray();
    for (const r of rows) {
      const { c, k, ...rec } = r;
      void k;
      (ds as unknown as Record<string, unknown[]>)[c]?.push(rec);
    }
    const s = await this.db.meta.get('settings');
    const g = await this.db.meta.get('game');
    if (s) ds.settings = { ...defaultSettings(), ...(s as object), id: 'main' } as Dataset['settings'];
    if (g) ds.game = { ...defaultGame(), ...(g as object), id: 'main' } as Dataset['game'];
    for (const c of COLLECTIONS) (ds[c] as { createdAt: string }[]).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    return ds;
  }

  async commit(mutations: Mutation[], log: ChangeLogEntry[]): Promise<void> {
    validateMutations(mutations);
    await this.db.transaction('rw', this.db.records, this.db.meta, this.db.changelog, async () => {
      for (const m of mutations) {
        if (m.kind === 'put') {
          const k = keyOf(m.collection, m.record.id);
          const cur = await this.db.records.get(k);
          const curV = cur?.version ?? null;
          if (curV !== m.expectedVersion) throw new ConflictError(`"${String((m.record as Record<string, unknown>).name ?? (m.record as Record<string, unknown>).title ?? (m.record as Record<string, unknown>).text ?? m.collection)}"`);
          await this.db.records.put({ ...m.record, c: m.collection, k });
        } else {
          const id = m.kind;
          const cur = await this.db.meta.get(id);
          const curV = cur?.version ?? 1;
          if (cur && curV !== m.expectedVersion) throw new ConflictError(id === 'settings' ? 'inställningarna' : 'spelet');
          await this.db.meta.put({ ...(m.record as unknown as Row), id });
        }
      }
      if (log.length) await this.db.changelog.bulkPut(log);
    });
    this.channel?.postMessage('changed');
  }

  onRemoteChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async changelog(limit: number): Promise<ChangeLogEntry[]> {
    return this.db.changelog.orderBy('at').reverse().limit(limit).toArray();
  }

  async putBlob(key: string, blob: Blob): Promise<void> {
    await this.db.blobs.put({ key, blob });
  }

  async getBlob(key: string): Promise<Blob | null> {
    return (await this.db.blobs.get(key))?.blob ?? null;
  }

  async listBackups(): Promise<BackupInfo[]> {
    const all = await this.db.backups.orderBy('at').reverse().toArray();
    return all.map(({ data, ...b }) => {
      void data;
      return b;
    });
  }

  async createBackup(note: string, data: Dataset): Promise<BackupInfo> {
    const at = new Date().toISOString();
    const info: BackupInfo = { id: `${at.slice(0, 10)}-${at.slice(11, 19).replace(/:/g, '')}`, at, note, counts: datasetCounts(data) };
    await this.db.backups.put({ ...info, data: JSON.stringify(data) });
    // Spara de senaste 30 automatiska kopiorna plus alla manuella
    const autos = (await this.db.backups.orderBy('at').toArray()).filter((b) => b.note.startsWith('Daglig'));
    for (const b of autos.slice(0, Math.max(0, autos.length - 30))) await this.db.backups.delete(b.id);
    return info;
  }

  async readBackup(id: string): Promise<Dataset | null> {
    const b = await this.db.backups.get(id);
    return b ? (JSON.parse(b.data) as Dataset) : null;
  }

  async replaceAll(data: Dataset, note: string): Promise<void> {
    await this.createBackup(`Före ${note}`, await this.load());
    await this.db.transaction('rw', this.db.records, this.db.meta, async () => {
      await this.db.records.clear();
      for (const c of COLLECTIONS) {
        const rows = (data[c] as unknown as Row[]).map((r) => ({ ...r, c, k: keyOf(c, r.id) }));
        if (rows.length) await this.db.records.bulkPut(rows);
      }
      await this.db.meta.put({ ...(data.settings as unknown as Row), id: 'settings' });
      await this.db.meta.put({ ...(data.game as unknown as Row), id: 'game' });
    });
    this.channel?.postMessage('changed');
  }
}
