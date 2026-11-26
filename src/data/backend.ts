import type { AgentMessage, AgentRun, ChatThread } from '../domain/agents';
import { isBalanced } from '../domain/ledger';
import type { ChangeLogEntry, CollectionName, Dataset, GameState, Settings, Voucher } from '../domain/types';

export type Mutation =
  | { kind: 'put'; collection: CollectionName; record: { id: string; version: number } & Record<string, unknown>; expectedVersion: number | null }
  | { kind: 'settings'; record: Settings; expectedVersion: number }
  | { kind: 'game'; record: GameState; expectedVersion: number };

export class ConflictError extends Error {
  constructor(public what: string) {
    super(`Någon annan har ändrat ${what} samtidigt. Datan har laddats om, gör ändringen igen.`);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface BackupInfo {
  id: string;
  at: string;
  note: string;
  counts: string;
}

export interface PresenceInfo {
  user: string;
  name: string;
  online: boolean;
  lastSeen: string | null;
  me: boolean;
}

export interface Backend {
  readonly kind: 'local' | 'memory' | 'supabase';
  /** Vem som är inne och när de senast var aktiva (bara när data delas, dvs. Supabase). */
  presence?: (cb: (list: PresenceInfo[]) => void) => () => void;
  /** Agenternas körningar (Agentbyn). Finns bara med Supabase. */
  agentRuns?: (limit: number) => Promise<AgentRun[]>;
  /** Chatten med agenterna (telefonen i husen och gruppchatten). Finns bara med Supabase. */
  agentChat?: {
    list: (limit: number) => Promise<AgentMessage[]>;
    send: (thread: ChatThread, body: string, replyTo?: string | null) => Promise<void>;
    decide: (id: string, status: 'godkänd' | 'avvisad') => Promise<void>;
  };
  /** Bilder till agenterna (referensbilder för Scout, bildrutor ur klipp för Marketer). Bara med Supabase. */
  media?: {
    list: (kind: MediaKind, refId: string) => Promise<MediaItem[]>;
    add: (kind: MediaKind, refId: string, images: { data: string; note?: string }[]) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };
  /** Introduktionen första gången man loggar in (sparas på kontot, gäller alla enheter). */
  intro?: { seen: boolean; name: string; markSeen: () => Promise<void> };
  /** Inloggad användares e-post (Supabase). */
  readonly email?: string;
  readonly durable: boolean;
  load(): Promise<Dataset>;
  /** Atomiskt: allt sparas eller inget. Versionsnummer kontrolleras per rad. */
  commit(mutations: Mutation[], log: ChangeLogEntry[]): Promise<void>;
  /** Anropas när någon annan (annan flik/enhet) har ändrat data. */
  onRemoteChange(cb: () => void): () => void;
  changelog(limit: number): Promise<ChangeLogEntry[]>;
  putBlob(key: string, blob: Blob): Promise<void>;
  getBlob(key: string): Promise<Blob | null>;
  listBackups(): Promise<BackupInfo[]>;
  createBackup(note: string, data: Dataset): Promise<BackupInfo>;
  readBackup(id: string): Promise<Dataset | null>;
  /** Ersätt all data (vid återställning/import). Tar alltid en säkerhetskopia först. */
  replaceAll(data: Dataset, note: string): Promise<void>;
}

/** Regler som gäller oavsett lagring. Databasen (Supabase) har samma regler som triggers. */
export function validateMutations(muts: Mutation[]): void {
  for (const m of muts) {
    if (m.kind !== 'put') continue;
    const r = m.record as Record<string, unknown>;
    if (!r.id) throw new ValidationError('Post saknar id.');
    if (m.collection === 'vouchers') {
      const v = r as unknown as Voucher;
      if (!v.deletedAt && !isBalanced(v.lines)) throw new ValidationError(`Verifikat V${v.nr} balanserar inte (debet ≠ kredit).`);
      for (const l of v.lines) if (!Number.isInteger(l.debit) || !Number.isInteger(l.credit)) throw new ValidationError('Belopp måste vara hela ören.');
    }
    if (m.collection === 'items') {
      for (const k of ['cost', 'salePrice'] as const) if (!Number.isInteger(r[k]) || (r[k] as number) < 0) throw new ValidationError('Ogiltigt belopp på plagg.');
    }
    if (m.collection === 'drops') {
      for (const k of ['shipping', 'customs'] as const) if (!Number.isInteger(r[k]) || (r[k] as number) < 0) throw new ValidationError('Ogiltigt belopp på drop.');
    }
  }
}

/** Tillämpa mutationer på ett dataset (ny kopia, gamla objekt ändras aldrig). */
export function applyMutations(ds: Dataset, muts: Mutation[]): Dataset {
  const next: Dataset = { ...ds };
  const touched = new Set<CollectionName>();
  for (const m of muts) {
    if (m.kind === 'settings') next.settings = m.record;
    else if (m.kind === 'game') next.game = m.record;
    else {
      if (!touched.has(m.collection)) {
        (next as unknown as Record<string, unknown[]>)[m.collection] = [...(ds[m.collection] as unknown[])];
        touched.add(m.collection);
      }
      const arr = next[m.collection] as unknown as { id: string }[];
      const i = arr.findIndex((x) => x.id === m.record.id);
      if (i >= 0) arr[i] = m.record;
      else arr.push(m.record);
    }
  }
  return next;
}

export function datasetCounts(d: Dataset): string {
  const live = <T extends { deletedAt?: string | null }>(x: T[]) => x.filter((y) => !y.deletedAt).length;
  return `${live(d.drops)} drops, ${live(d.items)} plagg, ${live(d.vouchers)} verifikat`;
}

export type MediaKind = 'scout-ref' | 'clip-frame';
export interface MediaItem {
  id: string;
  kind: MediaKind;
  refId: string;
  idx: number;
  data: string;
  note: string;
}
