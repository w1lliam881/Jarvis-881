import { emptyDataset } from '../domain/defaults';
import type { ChangeLogEntry, Dataset } from '../domain/types';
import { applyMutations, ConflictError, datasetCounts, validateMutations, type Backend, type BackupInfo, type Mutation } from './backend';

/** Lagring i minnet. Används i tester och när webbläsaren inte tillåter lagring (t.ex. privat läge). */
export class MemoryBackend implements Backend {
  readonly kind = 'memory' as const;
  readonly durable = false;
  private data: Dataset;
  private log: ChangeLogEntry[] = [];
  private blobs = new Map<string, Blob>();
  private backups: (BackupInfo & { data: string })[] = [];

  constructor(initial?: Dataset) {
    this.data = structuredClone(initial ?? emptyDataset());
  }

  async load(): Promise<Dataset> {
    return structuredClone(this.data);
  }

  async commit(mutations: Mutation[], log: ChangeLogEntry[]): Promise<void> {
    validateMutations(mutations);
    for (const m of mutations) {
      if (m.kind === 'put') {
        const cur = (this.data[m.collection] as { id: string; version: number }[]).find((x) => x.id === m.record.id);
        if ((cur?.version ?? null) !== m.expectedVersion) throw new ConflictError(m.collection);
      } else if (m.kind === 'settings' && this.data.settings.version !== m.expectedVersion) throw new ConflictError('inställningarna');
      else if (m.kind === 'game' && this.data.game.version !== m.expectedVersion) throw new ConflictError('spelet');
    }
    this.data = structuredClone(applyMutations(this.data, mutations));
    this.log.push(...log);
  }

  onRemoteChange(): () => void {
    return () => {};
  }

  async changelog(limit: number): Promise<ChangeLogEntry[]> {
    return this.log.slice(-limit).reverse();
  }

  async putBlob(key: string, blob: Blob): Promise<void> {
    this.blobs.set(key, blob);
  }

  async getBlob(key: string): Promise<Blob | null> {
    return this.blobs.get(key) ?? null;
  }

  async listBackups(): Promise<BackupInfo[]> {
    return this.backups.map(({ data, ...b }) => {
      void data;
      return b;
    });
  }

  async createBackup(note: string, data: Dataset): Promise<BackupInfo> {
    const at = new Date().toISOString();
    const info = { id: `${at}-${this.backups.length}`, at, note, counts: datasetCounts(data) };
    this.backups.unshift({ ...info, data: JSON.stringify(data) });
    return info;
  }

  async readBackup(id: string): Promise<Dataset | null> {
    const b = this.backups.find((x) => x.id === id);
    return b ? JSON.parse(b.data) : null;
  }

  async replaceAll(data: Dataset, note: string): Promise<void> {
    await this.createBackup(`Före ${note}`, this.data);
    this.data = structuredClone(data);
  }
}
