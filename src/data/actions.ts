import { baseRecord, newId } from '../domain/defaults';
import { eventLines, EVENT_TYPES, nextVoucherNr } from '../domain/ledger';
import { todayISO } from '../domain/dates';
import type { ParsedRow } from '../domain/parse';
import type {
  Attachment,
  Candidate,
  CheckStatus,
  Dataset,
  Drop,
  EventType,
  Goal,
  InboxDraft,
  Item,
  Ore,
  Platform,
  Settings,
  Task,
  VideoPost,
  Voucher,
  VoucherLine,
} from '../domain/types';
import { store, type Change } from './store';

const now = () => new Date().toISOString();
const find = <T extends { id: string }>(xs: T[], id: string) => xs.find((x) => x.id === id);

export function newItem(dropId: string, p: Partial<Item>): Item {
  return {
    ...baseRecord(),
    dropId,
    name: 'Plagg',
    category: 'Övrigt',
    brand: '',
    model: '',
    size: '',
    cost: 0,
    weightKg: 0,
    salePrice: 0,
    saleDate: null,
    platform: null,
    productId: '',
    comment: '',
    ok: 0,
    saleBooking: 'individual',
    location: '',
    listedAt: null,
    returnedAt: null,
    ...p,
  };
}

// ---------- Drops och plagg ----------

export function createDrop(p: Partial<Drop>, rows: ParsedRow[]): Promise<boolean> {
  const drop: Drop = {
    ...baseRecord(),
    name: 'Ny drop',
    date: todayISO(),
    shipping: 0,
    customs: 0,
    shippingDate: null,
    customsDate: null,
    status: 'beställd',
    note: '',
    ok: 0,
    ...p,
  };
  return store().save(`Ny drop: ${drop.name} (${rows.length} plagg)`, () => [
    { collection: 'drops', record: drop as never },
    ...rows.map((r) => ({ collection: 'items' as const, record: newItem(drop.id, { name: r.name, category: r.category, cost: r.cost, weightKg: r.weightKg }) as never })),
  ]);
}

export function addItems(dropId: string, rows: ParsedRow[]): Promise<boolean> {
  return store().save(`${rows.length} plagg tillagda`, () =>
    rows.map((r) => ({ collection: 'items' as const, record: newItem(dropId, { name: r.name, category: r.category, cost: r.cost, weightKg: r.weightKg }) as never })),
  );
}

export function updateDrop(id: string, patch: Partial<Drop>, label = 'Drop sparad'): Promise<boolean> {
  return store().save(label, (ds) => {
    const d = find(ds.drops, id);
    return d ? [{ collection: 'drops', record: { ...d, ...patch } as never }] : [];
  });
}

export function updateItem(id: string, patch: Partial<Item>, label = 'Plagg sparat'): Promise<boolean> {
  return store().save(label, (ds) => {
    const i = find(ds.items, id);
    if (!i) return [];
    const next = { ...i, ...patch };
    // En ny försäljning i Jarvis 2.0 får alltid ett eget verifikat
    if (!(i.salePrice > 0) && next.salePrice > 0) next.saleBooking = 'individual';
    if (next.salePrice > 0 && !next.saleDate) next.saleDate = todayISO();
    if (!(next.salePrice > 0)) next.saleDate = null;
    return [{ collection: 'items', record: next as never }];
  });
}

export function sellItem(id: string, price: Ore, date: string, platform: Platform | null, comment?: string): Promise<boolean> {
  return store().save('Försäljning registrerad', (ds) => {
    const i = find(ds.items, id);
    if (!i) return [];
    return [
      {
        collection: 'items',
        record: { ...i, salePrice: price, saleDate: date, platform, comment: comment ?? i.comment, returnedAt: null, saleBooking: 'individual' } as never,
        summary: `Sålt: ${i.name} för ${Math.round(price / 100)} kr`,
      },
    ];
  });
}

export function undoSale(id: string): Promise<boolean> {
  return updateItem(id, { salePrice: 0, saleDate: null, platform: null }, 'Försäljning ångrad');
}

export function returnItem(id: string): Promise<boolean> {
  return store().save('Retur registrerad', (ds) => {
    const i = find(ds.items, id);
    if (!i) return [];
    // En retur gör plagget osålt igen. Försäljningsverifikatet tas bort automatiskt.
    return [{ collection: 'items', record: { ...i, salePrice: 0, saleDate: null, platform: null, comment: `${i.comment} (retur ${todayISO()})`.trim() } as never }];
  });
}

export function deleteItem(id: string): Promise<boolean> {
  return store().save('Plagg borttaget', (ds) => {
    const i = find(ds.items, id);
    return i ? [{ collection: 'items', record: { ...i, deletedAt: now() } as never }] : [];
  });
}

export function deleteDrop(id: string): Promise<boolean> {
  return store().save('Drop borttagen', (ds) => {
    const d = find(ds.drops, id);
    if (!d) return [];
    const t = now();
    return [
      { collection: 'drops', record: { ...d, deletedAt: t } as never },
      ...ds.items.filter((i) => i.dropId === id && !i.deletedAt).map((i) => ({ collection: 'items' as const, record: { ...i, deletedAt: t } as never })),
    ];
  });
}

export function setOk(kind: 'drops' | 'items' | 'vouchers', id: string, ok: CheckStatus): Promise<boolean> {
  return store().save(ok === 1 ? 'Markerad som stämmer' : ok === 2 ? 'Markerad som fel' : 'Markering borttagen', (ds) => {
    const r = find(ds[kind] as { id: string }[], id);
    return r ? [{ collection: kind, record: { ...r, ok } as never }] : [];
  });
}

export function fillSaleDates(): Promise<boolean> {
  return store().save('Säljdatum ifyllda med dropens datum', (ds) =>
    ds.items
      .filter((i) => !i.deletedAt && i.salePrice > 0 && !i.saleDate)
      .map((i) => ({ collection: 'items' as const, record: { ...i, saleDate: find(ds.drops, i.dropId)?.date ?? todayISO() } as never })),
  );
}

// ---------- Bokföring ----------

export function bookEvent(p: {
  type: EventType;
  amount: Ore;
  date: string;
  text?: string;
  vatIncluded?: boolean;
  dropId?: string | null;
  itemId?: string | null;
}): Promise<boolean> {
  return store().save(`Bokfört: ${p.text || EVENT_TYPES[p.type].label}`, (ds) => {
    const changes: Change[] = [];
    // Frakt och tull kopplade till en drop sparas på dropen (då fördelas de på plaggen och bokförs automatiskt).
    if (p.dropId && (p.type === 'shipping' || p.type === 'customs')) {
      const d = find(ds.drops, p.dropId);
      if (d) {
        const patch = p.type === 'shipping' ? { shipping: d.shipping + p.amount, shippingDate: p.date } : { customs: d.customs + p.amount, customsDate: p.date };
        return [{ collection: 'drops', record: { ...d, ...patch } as never }];
      }
    }
    const v = makeVoucher(ds, {
      date: p.date,
      text: p.text || EVENT_TYPES[p.type].label,
      lines: eventLines(p.type, p.amount, { enabled: ds.settings.vatEnabled, included: !!p.vatIncluded }),
      source: 'event',
      eventType: p.type,
      dropId: p.dropId ?? null,
      itemId: p.itemId ?? null,
    });
    changes.push({ collection: 'vouchers', record: v as never });
    return changes;
  });
}

export function makeVoucher(ds: Dataset, p: Partial<Voucher> & { lines: VoucherLine[] }): Voucher {
  return {
    ...baseRecord(newId('v')),
    nr: nextVoucherNr(ds.vouchers),
    date: todayISO(),
    text: 'Verifikat',
    source: 'manual',
    key: null,
    dropId: null,
    itemId: null,
    eventType: null,
    ok: 0,
    ...p,
  };
}

export function saveManualVoucher(v: Partial<Voucher> & { lines: VoucherLine[] }, id?: string): Promise<boolean> {
  return store().save(id ? 'Verifikat ändrat' : 'Verifikat bokfört', (ds) => {
    if (id) {
      const cur = find(ds.vouchers, id);
      if (!cur || cur.source === 'auto') return [];
      return [{ collection: 'vouchers', record: { ...cur, ...v } as never }];
    }
    return [{ collection: 'vouchers', record: makeVoucher(ds, { source: 'manual', ...v }) as never }];
  });
}

export function deleteVoucher(id: string, label = 'Verifikat borttaget'): Promise<boolean> {
  return store().save(label, (ds) => {
    const v = find(ds.vouchers, id);
    if (!v || v.source === 'auto') return [];
    return [{ collection: 'vouchers', record: { ...v, deletedAt: now() } as never }];
  });
}

/** Koppla en bokförd försäljning till ett osålt plagg (avstämning). */
export function linkSaleToItem(voucherId: string, itemId: string, amount: Ore): Promise<boolean> {
  return store().save('Försäljning kopplad till plagg', (ds) => {
    const v = find(ds.vouchers, voucherId);
    const i = find(ds.items, itemId);
    if (!v || !i) return [];
    return [
      { collection: 'items', record: { ...i, salePrice: amount, saleDate: v.date, saleBooking: 'individual' } as never },
      { collection: 'vouchers', record: { ...v, itemId: i.id, dropId: i.dropId } as never },
    ];
  });
}

// ---------- Underlag ----------

export async function addAttachment(file: File | null, p: Partial<Attachment>): Promise<boolean> {
  const s = store();
  let blobKey: string | null = null;
  if (file) {
    blobKey = newId('blob');
    await s.backend.putBlob(blobKey, file);
  }
  const a: Attachment = {
    ...baseRecord(),
    voucherId: null,
    dropId: null,
    name: file?.name ?? 'Inklistrad text',
    mime: file?.type ?? 'text/plain',
    size: file?.size ?? (p.text?.length ?? 0),
    kind: 'annat',
    amount: null,
    date: todayISO(),
    blobKey,
    text: null,
    ...p,
  };
  return s.save('Underlag bifogat', () => [{ collection: 'attachments', record: a as never }]);
}

export function deleteAttachment(id: string): Promise<boolean> {
  return store().save('Underlag borttaget', (ds) => {
    const a = find(ds.attachments, id);
    return a ? [{ collection: 'attachments', record: { ...a, deletedAt: now() } as never }] : [];
  });
}

// ---------- Uppgifter, mål, kalkyl ----------

export function addTask(title: string, date = todayISO(), priority: Task['priority'] = 'medel', minutes: number | null = null): Promise<boolean> {
  const t: Task = { ...baseRecord(), title, date, done: false, doneAt: null, minutes, priority };
  return store().save('Uppgift tillagd', () => [{ collection: 'tasks', record: t as never }]);
}

export function addTasks(lines: string[], date = todayISO()): Promise<boolean> {
  return store().save(`${lines.length} uppgifter tillagda`, () =>
    lines.map((title) => ({ collection: 'tasks' as const, record: { ...baseRecord(), title, date, done: false, doneAt: null, minutes: null, priority: 'medel' } as never })),
  );
}

export function toggleTask(id: string): Promise<boolean> {
  return store().save('Uppgift uppdaterad', (ds) => {
    const t = find(ds.tasks, id);
    return t ? [{ collection: 'tasks', record: { ...t, done: !t.done, doneAt: t.done ? null : todayISO() } as never }] : [];
  });
}

export function updateTask(id: string, patch: Partial<Task>): Promise<boolean> {
  return store().save('Uppgift sparad', (ds) => {
    const t = find(ds.tasks, id);
    return t ? [{ collection: 'tasks', record: { ...t, ...patch } as never }] : [];
  });
}

export function deleteTask(id: string): Promise<boolean> {
  return store().save('Uppgift borttagen', (ds) => {
    const t = find(ds.tasks, id);
    return t ? [{ collection: 'tasks', record: { ...t, deletedAt: now() } as never }] : [];
  });
}

export function saveGoal(g: Partial<Goal> & { name: string }, id?: string): Promise<boolean> {
  return store().save('Mål sparat', (ds) => {
    const cur = id ? find(ds.goals, id) : undefined;
    const rec: Goal = cur ? { ...cur, ...g } : { ...baseRecord(), kind: 'manual', target: 0, current: 0, unit: '', ...g };
    return [{ collection: 'goals', record: rec as never }];
  });
}

export function deleteGoal(id: string): Promise<boolean> {
  return store().save('Mål borttaget', (ds) => {
    const g = find(ds.goals, id);
    return g ? [{ collection: 'goals', record: { ...g, deletedAt: now() } as never }] : [];
  });
}

export function saveCandidate(c: Partial<Candidate>, id?: string): Promise<boolean> {
  return store().save('Kalkyl sparad', (ds) => {
    const cur = id ? find(ds.candidates, id) : undefined;
    const rec: Candidate = cur
      ? { ...cur, ...c }
      : { ...baseRecord(), name: 'Plagg', category: 'Jeans', brand: '', size: '', price: 0, weightKg: 0, plannedSalePrice: 0, ...c };
    return [{ collection: 'candidates', record: rec as never }];
  });
}

export function deleteCandidate(id: string): Promise<boolean> {
  return store().save('Kalkyl borttagen', (ds) => {
    const c = find(ds.candidates, id);
    return c ? [{ collection: 'candidates', record: { ...c, deletedAt: now() } as never }] : [];
  });
}

/** Köpt: flytta kalkylen till en drop (senaste beställda drop eller en ny). */
export function buyCandidate(id: string, weightKg: number): Promise<boolean> {
  return store().save('Plagg lagt i drop', (ds) => {
    const c = find(ds.candidates, id);
    if (!c) return [];
    const open = ds.drops.filter((d) => !d.deletedAt && d.status === 'beställd').sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const changes: Change[] = [];
    let dropId = open?.id;
    if (!dropId) {
      const d: Drop = { ...baseRecord(), name: `Drop ${todayISO().slice(0, 7)}`, date: todayISO(), shipping: 0, customs: 0, shippingDate: null, customsDate: null, status: 'beställd', note: '', ok: 0 };
      dropId = d.id;
      changes.push({ collection: 'drops', record: d as never });
    }
    changes.push({ collection: 'items', record: newItem(dropId, { name: c.name, category: c.category, brand: c.brand, size: c.size, cost: c.price, weightKg: c.weightKg || weightKg }) as never });
    changes.push({ collection: 'candidates', record: { ...c, deletedAt: now() } as never });
    return changes;
  });
}

// ---------- Marknadsföring ----------

export function saveVideo(v: Partial<VideoPost>, id?: string): Promise<boolean> {
  return store().save(id ? 'Klipp uppdaterat' : 'Klipp sparat', (ds) => {
    const cur = id ? find(ds.videos, id) : undefined;
    const rec: VideoPost = cur
      ? { ...cur, ...v }
      : {
          ...baseRecord(),
          platform: 'TikTok',
          title: '',
          type: 'Process',
          postedAt: new Date().toISOString(),
          lengthSec: 30,
          song: '',
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          dropIds: [],
          itemIds: [],
          ideaKey: null,
          note: '',
          ...v,
        };
    return [{ collection: 'videos', record: rec as never }];
  });
}

export function deleteVideo(id: string): Promise<boolean> {
  return store().save('Klipp borttaget', (ds) => {
    const v = find(ds.videos, id);
    return v ? [{ collection: 'videos', record: { ...v, deletedAt: now() } as never }] : [];
  });
}

export function setIdea(ideaKey: string, status: 'sparad' | 'använd' | 'avfärdad' | null): Promise<boolean> {
  return store().save(status === 'sparad' ? 'Idé sparad' : status === 'använd' ? 'Idé markerad som använd' : 'Idé uppdaterad', (ds) => {
    const cur = ds.ideas.find((i) => i.ideaKey === ideaKey);
    if (!status) return cur ? [{ collection: 'ideas', record: { ...cur, deletedAt: now() } as never }] : [];
    return [{ collection: 'ideas', record: (cur ? { ...cur, status, deletedAt: null } : { ...baseRecord(), ideaKey, status }) as never }];
  });
}

export function saveSearch(query: string): Promise<boolean> {
  return store().save('Sökning sparad', (ds) => (ds.searches.some((s) => !s.deletedAt && s.query === query) ? [] : [{ collection: 'searches', record: { ...baseRecord(), query } as never }]));
}

// ---------- Godkännandekö ----------

export function addDraft(d: Partial<InboxDraft>): Promise<boolean> {
  const rec: InboxDraft = {
    ...baseRecord(),
    source: 'mejl',
    status: 'väntar',
    title: 'Utkast',
    eventType: 'sale',
    amount: 0,
    date: todayISO(),
    rawText: '',
    dropId: null,
    itemId: null,
    platform: null,
    confidence: 0.5,
    ...d,
  };
  return store().save('Utkast lagt i godkännandekön', () => [{ collection: 'inbox', record: rec as never }]);
}

/** Godkänn ett utkast: försäljning kopplad till plagg blir en försäljning på plagget, annars en bokförd händelse. */
export function approveDraft(id: string, patch: Partial<InboxDraft>): Promise<boolean> {
  return store().save('Utkast godkänt och bokfört', (ds) => {
    const cur = find(ds.inbox, id);
    if (!cur) return [];
    const d = { ...cur, ...patch, status: 'godkänd' as const };
    const changes: Change[] = [{ collection: 'inbox', record: d as never }];
    if (d.eventType === 'sale' && d.itemId) {
      const i = find(ds.items, d.itemId);
      if (i) changes.push({ collection: 'items', record: { ...i, salePrice: d.amount, saleDate: d.date, platform: d.platform } as never });
    } else if (d.dropId && (d.eventType === 'shipping' || d.eventType === 'customs')) {
      const dr = find(ds.drops, d.dropId);
      if (dr) {
        const p = d.eventType === 'shipping' ? { shipping: dr.shipping + d.amount, shippingDate: d.date } : { customs: dr.customs + d.amount, customsDate: d.date };
        changes.push({ collection: 'drops', record: { ...dr, ...p } as never });
      }
    } else {
      const v = makeVoucher(ds, {
        date: d.date,
        text: d.title,
        lines: eventLines(d.eventType, d.amount, { enabled: ds.settings.vatEnabled, included: false }),
        source: 'event',
        eventType: d.eventType,
        dropId: d.dropId,
      });
      changes.push({ collection: 'vouchers', record: v as never });
      if (d.rawText)
        changes.push({
          collection: 'attachments',
          record: { ...baseRecord(), voucherId: v.id, dropId: d.dropId, name: `${d.source}-text`, mime: 'text/plain', size: d.rawText.length, kind: 'mejl', amount: d.amount, date: d.date, blobKey: null, text: d.rawText } as never,
        });
    }
    return changes;
  });
}

export function rejectDraft(id: string): Promise<boolean> {
  return store().save('Utkast avvisat', (ds) => {
    const d = find(ds.inbox, id);
    return d ? [{ collection: 'inbox', record: { ...d, status: 'avvisad' } as never }] : [];
  });
}

// ---------- Inställningar ----------

export function updateSettings(patch: Partial<Settings>, label = 'Inställningar sparade'): Promise<boolean> {
  return store().save(label, (ds) => [{ settings: { ...ds.settings, ...patch } }]);
}
