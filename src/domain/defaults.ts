import type { BaseRecord, Dataset, GameState, Settings } from './types';

export function defaultSettings(): Settings {
  return {
    id: 'main',
    version: 1,
    companyName: '881',
    minRoiPct: 50,
    minProfit: 10000,
    packaging: 1000,
    shippingPerKg: 15500,
    customsRate: 0.255,
    leadWeeks: 3,
    coverWeeks: 4,
    salesPerWeekOverride: 0,
    budget: 0,
    vatEnabled: false,
    importVatToCustoms: true,
    gameEnabled: true,
    gameSound: false,
    gameStartedAt: null,
    theme: 'system',
    videoTypes: [],
    videoAbilities: { face: true, voice: true, package: true, garments: true, time: true },
    attachmentsFlag: true,
    migratedAt: null,
    userName: 'Jag',
    updatedAt: new Date(0).toISOString(),
  };
}

export function defaultGame(): GameState {
  return { id: 'main', version: 1, completed: {}, badgeBaseline: {}, bossesBeaten: {}, title: null, seenLevel: 1, updatedAt: new Date(0).toISOString() };
}

export function emptyDataset(): Dataset {
  return {
    drops: [],
    items: [],
    vouchers: [],
    attachments: [],
    tasks: [],
    goals: [],
    candidates: [],
    videos: [],
    ideas: [],
    searches: [],
    inbox: [],
    settings: defaultSettings(),
    game: defaultGame(),
  };
}

let counter = 0;
export function newId(prefix = ''): string {
  counter = (counter + 1) % 1679616;
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${rnd}`;
}

export function baseRecord(id?: string, by?: string): BaseRecord {
  const now = new Date().toISOString();
  return { id: id ?? newId(), version: 1, createdAt: now, updatedAt: now, updatedBy: by, deletedAt: null };
}
