import { baseRecord, defaultSettings, emptyDataset } from './defaults';
import { accountTotals, diffLedger, nextVoucherNr } from './ledger';
import { isSold, live } from './metrics';
import { toOre } from './money';
import { isISODate } from './dates';
import { CATEGORIES, type Category, type CheckStatus, type Dataset, type Drop, type Item, type Task, type Voucher, type Candidate, type Goal } from './types';

// Format i Jarvis v14:s export ("Ladda ner kopia") och audit-filen.
interface V14Item {
  id: string;
  n: string;
  k?: string;
  m?: string;
  s?: string;
  p?: number;
  w?: number;
  sp?: number;
  sd?: string;
  cm?: string;
  bk?: number;
  ok?: number;
}
interface V14Drop {
  id: string;
  n: string;
  d: string;
  pd?: string;
  frakt?: number;
  tull?: number;
  items: V14Item[];
  ok?: number;
}
interface V14Voucher {
  id: string;
  nr?: number;
  d: string;
  t: string;
  r: [number, number, number][];
  lk?: string;
  ad?: string;
  auto?: number;
  ok?: number;
  ts?: number;
}
export interface V14Export {
  drops?: V14Drop[];
  ledger?: V14Voucher[];
  v?: V14Voucher[];
  tasks?: { id: string; t: string; d?: string; done?: number; m?: number; dt?: string }[];
  cand?: { id: string; n: string; k?: string; m?: string; s?: string; p?: number; w?: number; sp?: number }[];
  goals?: { n: string; cur?: number; tgt?: number; u?: string }[];
  set?: { budget?: number; pack?: number; minroi?: number; minv?: number; lead?: number; cov?: number; wk?: number };
}

const cat = (k: string | undefined): Category => (CATEGORIES as readonly string[]).includes(k ?? '') ? (k as Category) : 'Övrigt';
const ok = (n: number | undefined): CheckStatus => (n === 1 || n === 2 ? n : 0);

export interface ImportResult {
  dataset: Dataset;
  warnings: string[];
}

/** Översätt en v14-export till Jarvis 2.0:s datamodell. Inget i källan ändras. */
export function importV14(src: V14Export, by = 'import'): ImportResult {
  const ds = emptyDataset();
  const warnings: string[] = [];
  const now = new Date().toISOString();
  const rec = (id: string) => ({ ...baseRecord(id, by), createdAt: now, updatedAt: now });

  for (const d of src.drops ?? []) {
    const drop: Drop = {
      ...rec(d.id),
      name: d.n || 'Drop',
      date: isISODate(d.d) ? d.d : now.slice(0, 10),
      shipping: toOre(d.frakt ?? 0),
      customs: toOre(d.tull ?? 0),
      shippingDate: null,
      customsDate: null,
      status: 'hemma',
      note: '',
      ok: ok(d.ok),
    };
    if (!isISODate(d.d)) warnings.push(`Drop "${d.n}" saknade giltigt datum.`);
    ds.drops.push(drop);
    for (const x of d.items ?? []) {
      const sold = (x.sp ?? 0) > 0;
      const item: Item = {
        ...rec(x.id),
        dropId: d.id,
        name: x.n || 'Plagg',
        category: cat(x.k),
        brand: x.m ?? '',
        model: '',
        size: x.s ?? '',
        cost: toOre(x.p ?? 0),
        weightKg: x.w ?? 0,
        salePrice: sold ? toOre(x.sp ?? 0) : 0,
        saleDate: sold && isISODate(x.sd) ? x.sd! : null,
        platform: null,
        comment: x.cm ?? '',
        ok: ok(x.ok),
        saleBooking: x.bk ? 'aggregate' : 'individual',
        location: '',
        listedAt: null,
        returnedAt: null,
      };
      ds.items.push(item);
    }
  }

  const itemIds = new Set(ds.items.map((i) => i.id));
  const dropIds = new Set(ds.drops.map((d) => d.id));
  const ledger = src.ledger ?? src.v ?? [];
  for (const v of ledger) {
    const lines = (v.r ?? []).map(([account, debit, credit]) => ({ account: Number(account), debit: toOre(debit), credit: toOre(credit) }));
    let source: Voucher['source'] = 'v14';
    let key: string | null = null;
    let dropId: string | null = null;
    let itemId: string | null = null;
    const lk = v.lk ?? '';
    if (/^in-/.test(lk) && dropIds.has(lk.slice(3))) {
      source = 'auto';
      dropId = lk.slice(3);
      key = `drop:${dropId}:purchase`;
    } else if (/^out-/.test(lk) && dropIds.has(lk.slice(4))) {
      source = 'auto';
      dropId = lk.slice(4);
      key = `drop:${dropId}:sales:${(isISODate(v.d) ? v.d : now).slice(0, 7)}`;
    } else if (lk && itemIds.has(lk)) {
      itemId = lk;
      dropId = ds.items.find((i) => i.id === lk)!.dropId;
      if (v.auto) {
        source = 'auto';
        key = `item:${lk}:sale`;
      }
    } else if (v.ad && dropIds.has(v.ad)) {
      dropId = v.ad;
    } else if (lk) {
      warnings.push(`Verifikat V${v.nr ?? '?'} var kopplat till något som inte finns (${lk}).`);
    }
    ds.vouchers.push({
      ...rec(v.id),
      nr: v.nr ?? 0,
      date: isISODate(v.d) ? v.d : now.slice(0, 10),
      text: v.t ?? '',
      lines,
      source,
      key,
      dropId,
      itemId,
      eventType: null,
      ok: ok(v.ok),
    });
  }
  // Verifikat utan nummer får nästa lediga nummer
  for (const v of ds.vouchers) if (!v.nr) v.nr = nextVoucherNr(ds.vouchers);

  for (const t of src.tasks ?? []) {
    const task: Task = {
      ...rec(t.id),
      title: t.t,
      date: isISODate(t.d) ? t.d! : now.slice(0, 10),
      done: !!t.done,
      doneAt: t.done ? (isISODate(t.dt) ? t.dt! : t.d ?? null) : null,
      minutes: t.m ?? null,
      priority: 'medel',
    };
    ds.tasks.push(task);
  }
  for (const c of src.cand ?? []) {
    const cand: Candidate = {
      ...rec(c.id),
      name: c.n,
      category: cat(c.k),
      brand: c.m ?? '',
      size: c.s ?? '',
      price: toOre(c.p ?? 0),
      weightKg: c.w ?? 0,
      plannedSalePrice: toOre(c.sp ?? 0),
    };
    ds.candidates.push(cand);
  }
  for (const [i, g] of (src.goals ?? []).entries()) {
    const goal: Goal = { ...rec(`goal-${i}`), name: g.n, kind: 'manual', target: g.tgt ?? 0, current: g.cur ?? 0, unit: g.u ?? '' };
    ds.goals.push(goal);
  }
  if (src.set) {
    const s = defaultSettings();
    if (src.set.pack != null) s.packaging = toOre(src.set.pack);
    if (src.set.minroi != null) s.minRoiPct = src.set.minroi;
    if (src.set.minv != null) s.minProfit = toOre(src.set.minv);
    if (src.set.lead != null) s.leadWeeks = src.set.lead;
    if (src.set.cov != null) s.coverWeeks = src.set.cov;
    if (src.set.wk != null) s.salesPerWeekOverride = src.set.wk;
    if (src.set.budget != null) s.budget = toOre(src.set.budget);
    ds.settings = s;
  }
  ds.settings.migratedAt = now;
  return { dataset: ds, warnings };
}

// ---------- Avstämning ----------

export interface ReconLine {
  label: string;
  source: number;
  target: number;
  unit: 'st' | 'öre';
  ok: boolean;
}

export interface Reconciliation {
  lines: ReconLine[];
  accounts: { account: number; source: number; target: number; ok: boolean }[];
  ok: boolean;
  ledgerChanges: { create: number; update: number; remove: number; details: string[] };
}

/** Summor direkt ur v14-filen (källan), utan att gå via den nya modellen. */
export function sourceTotals(src: V14Export) {
  let items = 0,
    sold = 0,
    purchase = 0,
    sales = 0,
    shipping = 0,
    customs = 0;
  for (const d of src.drops ?? []) {
    shipping += toOre(d.frakt ?? 0);
    customs += toOre(d.tull ?? 0);
    for (const x of d.items ?? []) {
      items++;
      purchase += toOre(x.p ?? 0);
      if ((x.sp ?? 0) > 0) {
        sold++;
        sales += toOre(x.sp ?? 0);
      }
    }
  }
  const acc: Record<number, number> = {};
  const ledger = src.ledger ?? src.v ?? [];
  for (const v of ledger) for (const [a, d, c] of v.r ?? []) acc[a] = (acc[a] ?? 0) + toOre(d) - toOre(c);
  return { drops: (src.drops ?? []).length, items, sold, purchase, sales, shipping, customs, vouchers: ledger.length, accounts: acc };
}

/**
 * Jämför källan med den importerade datan. `afterSync` är datasetet efter att automatiska verifikat
 * har räknats om – skillnader där visas som ändringar i bokföringen som användaren ska godkänna.
 */
export function reconcile(src: V14Export, imported: Dataset): Reconciliation {
  const s = sourceTotals(src);
  const items = live(imported.items);
  const t = {
    drops: live(imported.drops).length,
    items: items.length,
    sold: items.filter(isSold).length,
    purchase: items.reduce((a, i) => a + i.cost, 0),
    sales: items.filter(isSold).reduce((a, i) => a + i.salePrice, 0),
    shipping: live(imported.drops).reduce((a, d) => a + d.shipping, 0),
    customs: live(imported.drops).reduce((a, d) => a + d.customs, 0),
    vouchers: live(imported.vouchers).length,
  };
  const line = (label: string, a: number, b: number, unit: 'st' | 'öre'): ReconLine => ({ label, source: a, target: b, unit, ok: a === b });
  const lines = [
    line('Antal drops', s.drops, t.drops, 'st'),
    line('Antal plagg', s.items, t.items, 'st'),
    line('Antal sålda', s.sold, t.sold, 'st'),
    line('Summa inköp', s.purchase, t.purchase, 'öre'),
    line('Summa försäljning', s.sales, t.sales, 'öre'),
    line('Summa frakt', s.shipping, t.shipping, 'öre'),
    line('Summa tull', s.customs, t.customs, 'öre'),
    line('Antal verifikat', s.vouchers, t.vouchers, 'st'),
  ];
  const tgtAcc = accountTotals(imported.vouchers);
  const accSet = new Set([...Object.keys(s.accounts), ...Object.keys(tgtAcc)].map(Number));
  const accounts = [...accSet]
    .sort((a, b) => a - b)
    .map((a) => ({ account: a, source: s.accounts[a] ?? 0, target: tgtAcc[a] ?? 0, ok: (s.accounts[a] ?? 0) === (tgtAcc[a] ?? 0) }));
  const d = diffLedger(imported);
  const details = [
    ...d.create.map((x) => `Nytt automatiskt verifikat: ${x.text} (${x.date})`),
    ...d.update.map((x) => `Uppdateras: V${x.voucher.nr} ${x.voucher.text} → ${x.desired.text}`),
    ...d.remove.map((x) => `Tas bort (ersätts): V${x.nr} ${x.text}`),
  ];
  return {
    lines,
    accounts,
    ok: lines.every((x) => x.ok) && accounts.every((x) => x.ok),
    ledgerChanges: { create: d.create.length, update: d.update.length, remove: d.remove.length, details },
  };
}
