// Datamodell för Jarvis 2.0. Alla belopp är heltal i ören. Datum är ISO-strängar (YYYY-MM-DD).

export type Ore = number;
export type ISODate = string;
export type ID = string;

export const CATEGORIES = ['Jeans', 'Jackor', 'Tröjor', 'T-shirts', 'Skjortor', 'Byxor', 'Skor', 'Övrigt'] as const;
export type Category = (typeof CATEGORIES)[number];

export const PLATFORMS = ['Vinted', 'Plick', 'Egen hemsida', 'Annat'] as const;
export type Platform = (typeof PLATFORMS)[number];

/** 0 = ej kontrollerad, 1 = stämmer, 2 = fel */
export type CheckStatus = 0 | 1 | 2;

export interface BaseRecord {
  id: ID;
  version: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  deletedAt?: string | null;
}

export type DropStatus = 'beställd' | 'på väg' | 'hemma';

export interface Drop extends BaseRecord {
  name: string;
  date: ISODate;
  shipping: Ore;
  customs: Ore;
  shippingDate?: ISODate | null;
  customsDate?: ISODate | null;
  status: DropStatus;
  note: string;
  ok: CheckStatus;
}

/** individual = eget verifikat per försäljning. aggregate = ingår i dropens samlade försäljningsverifikat (äldre v14-data). */
export type SaleBooking = 'individual' | 'aggregate';

export interface Item extends BaseRecord {
  dropId: ID;
  name: string;
  category: Category;
  brand: string;
  model: string;
  size: string;
  cost: Ore;
  weightKg: number;
  salePrice: Ore;
  saleDate: ISODate | null;
  platform: Platform | null;
  /** Produkt-ID som används för att hålla isär plaggen, t.ex. "TS-Gar-2026-207" */
  productId: string;
  /** Passform, t.ex. "bootcut", "slim", "rak" */
  fit?: string;
  /** Mått i cm, nyckel = måttets namn (t.ex. "Midja") */
  measurements?: Record<string, number>;
  comment: string;
  ok: CheckStatus;
  saleBooking: SaleBooking;
  location: string;
  listedAt: ISODate | null;
  returnedAt: ISODate | null;
}

export type Account = number;

export interface VoucherLine {
  account: Account;
  debit: Ore;
  credit: Ore;
}

/** auto = skapas av systemet från en händelse (drop/plagg). event = registrerad händelse. manual = eget verifikat. v14 = importerat. */
export type VoucherSource = 'auto' | 'event' | 'manual' | 'v14';

export interface Voucher extends BaseRecord {
  nr: number;
  date: ISODate;
  text: string;
  lines: VoucherLine[];
  source: VoucherSource;
  /** Unik nyckel för automatiska verifikat, t.ex. "item:abc:sale" */
  key: string | null;
  dropId: ID | null;
  itemId: ID | null;
  eventType: EventType | null;
  ok: CheckStatus;
}

export type EventType =
  | 'sale'
  | 'purchase'
  | 'shipping'
  | 'customs'
  | 'material'
  | 'ads'
  | 'bankfee'
  | 'platformfee'
  | 'deposit'
  | 'withdrawal';

export type AttachmentKind = 'kvitto' | 'orderbekräftelse' | 'tullfaktura' | 'fraktkvitto' | 'utbetalning' | 'bankutdrag' | 'mejl' | 'annat';

export interface Attachment extends BaseRecord {
  voucherId: ID | null;
  dropId: ID | null;
  name: string;
  mime: string;
  size: number;
  kind: AttachmentKind;
  amount: Ore | null;
  date: ISODate | null;
  /** Lokalt: blob-nyckel i IndexedDB. Supabase: sökväg i storage. Inklistrad text lagras i text. */
  blobKey: string | null;
  text: string | null;
}

export interface Task extends BaseRecord {
  title: string;
  date: ISODate;
  done: boolean;
  doneAt: ISODate | null;
  minutes: number | null;
  priority: 'hög' | 'medel' | 'låg';
}

export interface Goal extends BaseRecord {
  name: string;
  kind: 'monthRevenue' | 'monthProfit' | 'monthSold' | 'manual';
  target: number;
  current: number;
  unit: string;
}

export interface Candidate extends BaseRecord {
  name: string;
  category: Category;
  brand: string;
  size: string;
  price: Ore;
  weightKg: number;
  plannedSalePrice: Ore;
}

export interface VideoPost extends BaseRecord {
  platform: 'TikTok' | 'Instagram' | 'YouTube Shorts';
  title: string;
  type: VideoType;
  postedAt: string; // ISO datetime
  lengthSec: number;
  song: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  dropIds: ID[];
  itemIds: ID[];
  ideaKey: string | null;
  note: string;
}

export const VIDEO_TYPES = ['Unboxing', 'Process', 'Tips', 'Styling', 'Berättelse', 'Trend/humor', 'Försäljning', 'Bakom kulisserna'] as const;
export type VideoType = (typeof VIDEO_TYPES)[number];

export interface IdeaState extends BaseRecord {
  ideaKey: string;
  status: 'sparad' | 'använd' | 'avfärdad';
}

export interface SearchSaved extends BaseRecord {
  query: string;
  /** Bevakning: påminn dagligen och visa färdiga sökningar */
  watch?: boolean;
  category?: Category | null;
  /** Eget maxpris i ören. Null = räknas ut från dina krav och din historik. */
  maxPrice?: Ore | null;
}

export type DraftStatus = 'väntar' | 'godkänd' | 'avvisad';

/** Utkast i godkännandekön, t.ex. från inklistrat mejl eller Gmail-import. */
export interface InboxDraft extends BaseRecord {
  source: 'mejl' | 'csv' | 'gmail' | 'sheets';
  status: DraftStatus;
  title: string;
  eventType: EventType;
  amount: Ore;
  date: ISODate;
  rawText: string;
  dropId: ID | null;
  itemId: ID | null;
  platform: Platform | null;
  confidence: number;
}

export interface Settings {
  id: 'main';
  version: number;
  companyName: string;
  minRoiPct: number;
  minProfit: Ore;
  packaging: Ore;
  shippingPerKg: Ore; // standard om historik saknas
  customsRate: number; // andel av (varuvärde + frakt), t.ex. 0.255
  leadWeeks: number;
  coverWeeks: number;
  salesPerWeekOverride: number;
  budget: Ore;
  vatEnabled: boolean;
  importVatToCustoms: boolean;
  gameEnabled: boolean;
  gameSound: boolean;
  gameStartedAt: string | null;
  theme: 'system' | 'light' | 'dark';
  videoTypes: VideoType[];
  videoAbilities: { face: boolean; voice: boolean; package: boolean; garments: boolean; time: boolean };
  attachmentsFlag: boolean;
  migratedAt: string | null;
  /** Bokföringen är låst till och med detta datum: verifikat där ändras inte, rättelser blir nya verifikat. */
  lockedThrough: ISODate | null;
  userName: string;
  /** Annonser: modellens längd och vikt (cm, kg) som skrivs sist i annonsen. 0 = utelämnas. */
  adModelHeight: number;
  /** Ungefärlig växelkurs för bevakningar: yen per krona */
  yenPerSek: number;
  adModelWeight: number;
  updatedAt: string;
}

export interface GameState {
  id: 'main';
  version: number;
  completed: Record<string, { at: string; xp: number; title: string }>;
  badgeBaseline: Record<string, number>;
  bossesBeaten: Record<string, string>;
  /** Dagar då bossens mål var uppfyllt. Tre olika dagar besegrar bossen. */
  bossHits?: Record<string, string[]>;
  title: string | null;
  seenLevel: number;
  updatedAt: string;
}

export interface ChangeLogEntry {
  id: ID;
  at: string;
  by: string;
  collection: CollectionName;
  recordId: ID;
  action: 'skapa' | 'ändra' | 'ta bort' | 'återställ';
  summary: string;
  before: unknown | null;
  after: unknown | null;
}

export interface Dataset {
  drops: Drop[];
  items: Item[];
  vouchers: Voucher[];
  attachments: Attachment[];
  tasks: Task[];
  goals: Goal[];
  candidates: Candidate[];
  videos: VideoPost[];
  ideas: IdeaState[];
  searches: SearchSaved[];
  inbox: InboxDraft[];
  settings: Settings;
  game: GameState;
}

export type CollectionName =
  | 'drops'
  | 'items'
  | 'vouchers'
  | 'attachments'
  | 'tasks'
  | 'goals'
  | 'candidates'
  | 'videos'
  | 'ideas'
  | 'searches'
  | 'inbox';

export const COLLECTIONS: CollectionName[] = [
  'drops',
  'items',
  'vouchers',
  'attachments',
  'tasks',
  'goals',
  'candidates',
  'videos',
  'ideas',
  'searches',
  'inbox',
];

export type RecordOf<C extends CollectionName> = Dataset[C][number];
