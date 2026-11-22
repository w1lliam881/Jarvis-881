import { useSyncExternalStore } from 'react';
import { newId } from '../domain/defaults';
import { diffLedger, nextVoucherNr } from '../domain/ledger';
import type { ChangeLogEntry, CollectionName, Dataset, GameState, RecordOf, Settings, Voucher } from '../domain/types';
import { applyMutations, ConflictError, ValidationError, type Backend, type Mutation } from './backend';

export interface SaveStatus {
  state: 'loading' | 'idle' | 'saving' | 'saved' | 'error';
  at: string | null;
  message: string | null;
}

export type Change =
  | { collection: CollectionName; record: { id: string } & Record<string, unknown>; summary?: string }
  | { settings: Settings }
  | { game: GameState };

interface UndoEntry {
  label: string;
  before: Change[];
  /** Versionen varje post fick av ändringen. Ångra vägras om någon ändrat posten efter det. */
  after: Map<string, number>;
}

type Listener = () => void;

/**
 * En enda sanning i minnet som speglar databasen. Varje ändring:
 * 1. bygger nya versioner av posterna (gamla objekt ändras aldrig),
 * 2. räknar om de automatiska verifikaten,
 * 3. sparas atomiskt med versionskontroll,
 * 4. visas först när databasen har bekräftat.
 */
export class Store {
  ds: Dataset | null = null;
  status: SaveStatus = { state: 'loading', at: null, message: null };
  private listeners = new Set<Listener>();
  private undoStack: UndoEntry[] = [];
  private queue: Promise<unknown> = Promise.resolve();
  private snapshot: { ds: Dataset | null; status: SaveStatus; canUndo: string | null } = { ds: null, status: this.status, canUndo: null };
  afterCommit: ((s: Store) => void) | null = null;

  constructor(public backend: Backend, public user: () => string) {}

  async init(): Promise<void> {
    this.ds = await this.backend.load();
    this.status = { state: 'idle', at: null, message: null };
    this.backend.onRemoteChange(() => {
      // Efter en ändring från någon annan går det inte att ångra äldre steg säkert
      this.undoStack = [];
      void this.reload('Uppdaterad från annan flik eller enhet');
    });
    this.emit();
  }

  async reload(message?: string): Promise<void> {
    this.ds = await this.backend.load();
    if (message) this.status = { state: 'saved', at: new Date().toISOString(), message };
    this.emit();
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getSnapshot = () => this.snapshot;

  private emit() {
    this.snapshot = { ds: this.ds, status: this.status, canUndo: this.undoStack.at(-1)?.label ?? null };
    this.listeners.forEach((l) => l());
  }

  /** Spara en uppsättning ändringar. Kastar vidare fel efter att ha visat dem. */
  save(label: string, build: (ds: Dataset) => Change[], opts: { undoable?: boolean } = {}): Promise<boolean> {
    const run = async () => {
      if (!this.ds) return false;
      const changes = build(this.ds);
      if (!changes.length) return true;
      this.status = { state: 'saving', at: this.status.at, message: null };
      this.emit();
      try {
        const { muts, log, before } = this.prepare(this.ds, changes);
        await this.backend.commit(muts, log);
        this.ds = applyMutations(this.ds, muts);
        if (opts.undoable !== false) {
          const after = new Map<string, number>();
          for (const m of muts) after.set(m.kind === 'put' ? `${m.collection}/${m.record.id}` : m.kind, m.record.version);
          this.undoStack.push({ label, before, after });
          if (this.undoStack.length > 30) this.undoStack.shift();
        }
        this.status = { state: 'saved', at: new Date().toISOString(), message: label };
        this.emit();
        this.afterCommit?.(this);
        return true;
      } catch (e) {
        if (e instanceof ConflictError) await this.reload();
        const msg = e instanceof ConflictError || e instanceof ValidationError ? e.message : `Kunde inte spara: ${(e as Error)?.message ?? 'okänt fel'}. Inget har ändrats.`;
        this.status = { state: 'error', at: this.status.at, message: msg };
        this.emit();
        return false;
      }
    };
    const p = this.queue.then(run, run);
    this.queue = p;
    return p;
  }

  async undo(): Promise<boolean> {
    const entry = this.undoStack.pop();
    if (!entry || !this.ds) return false;
    const ds = this.ds;
    const changed = entry.before.some((c) => {
      if ('settings' in c) return ds.settings.version !== entry.after.get('settings');
      if ('game' in c) return false;
      const cur = (ds[c.collection] as { id: string; version: number }[]).find((x) => x.id === c.record.id);
      return (cur?.version ?? 0) !== entry.after.get(`${c.collection}/${c.record.id}`);
    });
    if (changed) {
      this.status = { state: 'error', at: this.status.at, message: 'Kan inte ångra: posten har ändrats efteråt. Ändra tillbaka för hand.' };
      this.undoStack = [];
      this.emit();
      return false;
    }
    const ok = await this.save(`Ångrade: ${entry.label}`, () => entry.before, { undoable: false });
    if (!ok) this.undoStack.push(entry);
    this.emit();
    return ok;
  }

  private prepare(ds: Dataset, changes: Change[]) {
    const by = this.user();
    const now = new Date().toISOString();
    const muts: Mutation[] = [];
    const log: ChangeLogEntry[] = [];
    const before: Change[] = [];

    const putRecord = (collection: CollectionName, rec: { id: string } & Record<string, unknown>, summary?: string) => {
      const arr = (working[collection] as unknown as { id: string; version: number; deletedAt?: string | null }[]);
      const cur = arr.find((x) => x.id === rec.id);
      const lock = working.settings.lockedThrough;
      if (collection === 'vouchers' && lock) {
        const d0 = (cur as { date?: string } | undefined)?.date ?? '9999';
        const d1 = (rec as { date?: string }).date ?? d0;
        if (d0 <= lock || d1 <= lock) throw new ValidationError(`Bokföringen är låst till och med ${lock}. Bokför en rättelse med ett senare datum.`);
      }
      const orig = (ds[collection] as unknown as { id: string; version: number }[]).find((x) => x.id === rec.id);
      const next = {
        ...(cur ?? {}),
        ...rec,
        version: (cur?.version ?? 0) + 1,
        createdAt: (cur as { createdAt?: string } | undefined)?.createdAt ?? now,
        updatedAt: now,
        updatedBy: by,
      } as { id: string; version: number } & Record<string, unknown>;
      // Slå ihop flera ändringar av samma post i en och samma sparning
      const existing = muts.findIndex((m) => m.kind === 'put' && m.collection === collection && m.record.id === rec.id);
      if (existing >= 0) {
        const m = muts[existing] as Extract<Mutation, { kind: 'put' }>;
        next.version = m.record.version;
        muts[existing] = { ...m, record: next };
      } else {
        muts.push({ kind: 'put', collection, record: next, expectedVersion: cur?.version ?? null });
        if (orig) before.push({ collection, record: structuredClone(orig) as never });
        else before.push({ collection, record: { ...next, deletedAt: now } });
      }
      const action: ChangeLogEntry['action'] = !cur ? 'skapa' : next.deletedAt && !cur.deletedAt ? 'ta bort' : !next.deletedAt && cur.deletedAt ? 'återställ' : 'ändra';
      log.push({ id: newId('log'), at: now, by, collection, recordId: rec.id, action, summary: summary ?? describe(collection, next), before: cur ?? null, after: next });
      working = applyMutations(working, [{ kind: 'put', collection, record: next, expectedVersion: null }]);
    };

    let working: Dataset = ds;
    for (const c of changes) {
      if ('settings' in c) {
        before.push({ settings: structuredClone(ds.settings) });
        const rec = { ...c.settings, version: ds.settings.version + 1, updatedAt: now };
        muts.push({ kind: 'settings', record: rec, expectedVersion: ds.settings.version });
        working = { ...working, settings: rec };
        log.push({ id: newId('log'), at: now, by, collection: 'drops', recordId: 'settings', action: 'ändra', summary: 'Inställningar', before: null, after: null });
      } else if ('game' in c) {
        before.push({ game: structuredClone(ds.game) });
        const rec = { ...c.game, version: ds.game.version + 1, updatedAt: now };
        muts.push({ kind: 'game', record: rec, expectedVersion: ds.game.version });
        working = { ...working, game: rec };
      } else putRecord(c.collection, c.record, c.summary);
    }

    // Räkna om automatiska verifikat utifrån det nya läget
    const diff = diffLedger(working);
    let nr = nextVoucherNr(working.vouchers);
    for (const d of diff.create) {
      // Fast id per händelse: två flikar som skapar samma verifikat samtidigt krockar i versionskontrollen.
      // Ett tidigare borttaget verifikat med samma händelse återupplivas och behåller sitt nummer.
      const id = `auto-${d.key.replace(/[^a-zA-Z0-9:_-]/g, '_')}`;
      const old = working.vouchers.find((v) => v.id === id);
      putRecord('vouchers', {
        id,
        nr: old?.nr ?? nr++,
        date: d.date,
        text: d.text,
        lines: d.lines,
        source: 'auto',
        key: d.key,
        dropId: d.dropId,
        itemId: d.itemId,
        eventType: null,
        ok: 0,
        deletedAt: null,
      } satisfies Omit<Voucher, 'version' | 'createdAt' | 'updatedAt'> as never);
    }
    for (const u of diff.update)
      putRecord('vouchers', { ...u.voucher, date: u.desired.date, text: u.desired.text, lines: u.desired.lines, dropId: u.desired.dropId, itemId: u.desired.itemId } as never);
    for (const r of diff.remove) putRecord('vouchers', { ...r, deletedAt: now } as never, `Automatiskt verifikat V${r.nr} togs bort`);
    return { muts, log, before };
  }

  /** Ersätt all data, t.ex. vid import eller återställning. */
  async replaceAll(data: Dataset, note: string): Promise<void> {
    await this.backend.replaceAll(data, note);
    this.undoStack = [];
    await this.reload(note);
  }

  get<C extends CollectionName>(c: C, id: string | null | undefined): RecordOf<C> | undefined {
    if (!id || !this.ds) return undefined;
    return (this.ds[c] as RecordOf<C>[]).find((x) => x.id === id);
  }
}

function describe(c: CollectionName, r: Record<string, unknown>): string {
  const name = (r.name ?? r.title ?? r.text ?? r.query ?? '') as string;
  const labels: Record<CollectionName, string> = {
    drops: 'Drop',
    items: 'Plagg',
    vouchers: 'Verifikat',
    attachments: 'Underlag',
    tasks: 'Uppgift',
    goals: 'Mål',
    candidates: 'Kalkyl',
    videos: 'Klipp',
    ideas: 'Videoidé',
    searches: 'Sökning',
    inbox: 'Utkast',
  };
  return `${labels[c]}${name ? `: ${name}` : ''}`;
}

let current: Store | null = null;
export function setStore(s: Store) {
  current = s;
}
export function store(): Store {
  if (!current) throw new Error('Store saknas');
  return current;
}

export function useStore() {
  const s = store();
  return useSyncExternalStore(s.subscribe, s.getSnapshot);
}

/** Datasetet, garanterat laddat (används inne i appen efter start). */
export function useData(): Dataset {
  const { ds } = useStore();
  if (!ds) throw new Error('Data inte laddad');
  return ds;
}
