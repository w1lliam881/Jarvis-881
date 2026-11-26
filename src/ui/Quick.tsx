import { useMemo, useState } from 'react';
import { go } from './router';
import { ClipboardPaste, ListPlus, Package, Receipt, ShoppingBag } from 'lucide-react';
import { useData } from '../data/store';
import { addDraft, addTask, bookEvent, createDrop, sellItem } from '../data/actions';
import { todayISO } from '../domain/dates';
import { EVENT_TYPES } from '../domain/ledger';
import { allLanded, isSold, live } from '../domain/metrics';
import { kr, parseOre } from '../domain/money';
import { parseLines, parseMail } from '../domain/parse';
import { PLATFORMS, type EventType, type Platform } from '../domain/types';
import { Field, MoneyInput, Select, Sheet, confetti, cx } from './components/ui';
import { toast } from './Boot';

export type QuickKind = 'menu' | 'sale' | 'cost' | 'task' | 'drop' | 'mail';

export function QuickSheet({ kind, setKind }: { kind: QuickKind | null; setKind: (k: QuickKind | null) => void }) {
  const close = () => setKind(null);
  return (
    <>
      <Sheet open={kind === 'menu'} onClose={close} title="Ny">
        <div className="flex flex-col gap-2 pb-2">
          {[
            { k: 'sale' as const, icon: ShoppingBag, t: 'Försäljning', s: 'Ett plagg har sålts' },
            { k: 'cost' as const, icon: Receipt, t: 'Kostnad eller händelse', s: 'Frakt, tull, material, avgift, insättning' },
            { k: 'drop' as const, icon: Package, t: 'Drop', s: 'Klistra in plaggen, ett per rad' },
            { k: 'mail' as const, icon: ClipboardPaste, t: 'Klistra in mejl', s: 'Från Vinted, Plick eller Doorzo' },
            { k: 'task' as const, icon: ListPlus, t: 'Uppgift', s: 'Något att göra' },
          ].map((x) => (
            <button key={x.k} type="button" onClick={() => setKind(x.k)} className="card flex min-h-[60px] items-center gap-3 px-4 py-3 text-left active:bg-surface-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <x.icon size={20} aria-hidden />
              </span>
              <span className="flex flex-col">
                <span className="font-semibold">{x.t}</span>
                <span className="text-[13px] text-muted">{x.s}</span>
              </span>
            </button>
          ))}
        </div>
      </Sheet>
      {kind === 'sale' && <SaleSheet onClose={close} />}
      {kind === 'cost' && <CostSheet onClose={close} />}
      {kind === 'task' && <TaskSheet onClose={close} />}
      {kind === 'drop' && <DropSheet onClose={close} />}
      {kind === 'mail' && <MailSheet onClose={close} />}
    </>
  );
}

export function SaleSheet({ onClose, itemId: preset }: { onClose: () => void; itemId?: string }) {
  const ds = useData();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(preset ?? null);
  const [priceText, setPriceText] = useState('');
  const price = priceText.trim() ? parseOre(priceText) : 0;
  const [date, setDate] = useState(todayISO());
  const [otherDate, setOtherDate] = useState(false);
  // Plattformen du senast sålde på är förvald
  const [platform, setPlatformState] = useState<Platform>(() => {
    try {
      const p = localStorage.getItem('jarvis-senaste-plattform') as Platform | null;
      return p && (PLATFORMS as readonly string[]).includes(p) ? p : 'Vinted';
    } catch {
      return 'Vinted';
    }
  });
  const setPlatform = (p: Platform) => {
    setPlatformState(p);
    try {
      localStorage.setItem('jarvis-senaste-plattform', p);
    } catch {
      /* ingen lagring */
    }
  };
  const [busy, setBusy] = useState(false);
  const unsold = useMemo(() => allLanded(ds).filter((l) => !isSold(l.item)), [ds]);
  const list = unsold.filter((l) => `${l.item.name} ${l.item.productId} ${l.item.brand} ${l.item.size} ${l.item.category} ${l.drop.name}`.toLowerCase().includes(q.toLowerCase())).slice(0, 60);
  const chosen = sel ? unsold.find((l) => l.item.id === sel) : null;
  const save = async () => {
    if (!chosen || !price) return;
    setBusy(true);
    const ok = await sellItem(chosen.item.id, price, date, platform);
    setBusy(false);
    if (ok) {
      confetti();
      toast(`Sålt! Vinst ${kr(price - chosen.landed)}`);
      onClose();
    }
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title="Ny försäljning"
      footer={
        chosen ? (
          <button type="button" className="btn btn-primary mb-1 w-full" disabled={!price || busy} onClick={save}>
            {busy ? 'Sparar…' : `Spara försäljning${price ? ` · vinst ${kr(price - chosen.landed)}` : ''}`}
          </button>
        ) : null
      }
    >
      {chosen ? (
        <div className="flex flex-col gap-3">
          <div className="card flex items-center justify-between gap-3 bg-accent-soft p-3">
            <div className="min-w-0">
              <div className="truncate font-semibold">{chosen.item.name}</div>
              {chosen.item.productId && <div className="num text-[13px]">{chosen.item.productId}</div>}
              <div className="text-[13px] text-muted">
                {chosen.drop.name} · hemkostnad {kr(chosen.landed)}
              </div>
            </div>
            {!preset && (
              <button type="button" className="text-[13px] font-semibold text-accent" onClick={() => setSel(null)}>
                Byt
              </button>
            )}
          </div>
          <Field label="Såld för (kr)">
            <input
              className="field num text-[20px]"
              inputMode="decimal"
              autoFocus
              placeholder="t.ex. 800"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && price > 0 && void save()}
              aria-label="Såld för i kronor"
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">Plattform</span>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <button key={p} type="button" aria-pressed={platform === p} onClick={() => setPlatform(p)} className={cx('min-h-[40px] rounded-full border px-3.5 text-[14px] font-semibold', platform === p ? 'border-accent bg-accent text-surface' : 'border-line text-text')}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          {otherDate ? (
            <Field label="Datum">
              <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          ) : (
            <button type="button" className="self-start text-[13px] text-muted underline" onClick={() => setOtherDate(true)}>
              Såld idag. Annat datum?
            </button>
          )}
          <p className="m-0 text-[12px] text-muted">Produkt-ID, plagg och drop fylls i automatiskt. Verifikatet skapas och följer med om du ändrar priset senare.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input className="field" placeholder={`Sök bland ${unsold.length} osålda plagg…`} value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="card overflow-hidden">
            {list.map((l) => (
              <button key={l.item.id} type="button" onClick={() => setSel(l.item.id)} className="flex min-h-[52px] w-full items-center justify-between gap-3 border-b border-line-2 px-4 py-2.5 text-left last:border-b-0 active:bg-surface-2">
                <span className="min-w-0">
                  <span className="block truncate">{l.item.name}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {[l.item.productId, l.item.brand, l.item.size, l.drop.name].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="num shrink-0 text-[13px] text-muted">{kr(l.landed)}</span>
              </button>
            ))}
            {!list.length && <p className="m-0 p-4 text-[14px] text-muted">Inga osålda plagg matchar.</p>}
          </div>
        </div>
      )}
    </Sheet>
  );
}

const COST_TYPES: EventType[] = ['shipping', 'customs', 'purchase', 'material', 'ads', 'platformfee', 'bankfee', 'sale', 'deposit', 'withdrawal'];

export function CostSheet({ onClose, preset }: { onClose: () => void; preset?: { type?: EventType; dropId?: string } }) {
  const ds = useData();
  const [type, setType] = useState<EventType>(preset?.type ?? 'material');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayISO());
  const [text, setText] = useState('');
  const [dropId, setDropId] = useState(preset?.dropId ?? '');
  const [vat, setVat] = useState(false);
  const [busy, setBusy] = useState(false);
  const drops = live(ds.drops).sort((a, b) => (a.date < b.date ? 1 : -1));
  const dropLinked = type === 'shipping' || type === 'customs' || type === 'purchase';
  const save = async () => {
    if (!amount) return;
    setBusy(true);
    const ok = await bookEvent({ type, amount, date, text: text || undefined, vatIncluded: vat, dropId: dropLinked && dropId ? dropId : null });
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title="Kostnad eller händelse"
      footer={
        <button type="button" className="btn btn-primary mb-1 w-full" disabled={!amount || busy} onClick={save}>
          {busy ? 'Sparar…' : 'Bokför'}
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {COST_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className={cx('min-h-[36px] rounded-full border px-3 text-[13px] font-semibold', type === t ? 'border-transparent bg-forest text-on-forest' : 'border-line text-muted')}>
              {EVENT_TYPES[t].label}
            </button>
          ))}
        </div>
        <Field label="Belopp">
          <MoneyInput value={amount} onCommit={setAmount} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Datum">
            <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          {dropLinked ? (
            <Field label="Drop">
              <select className="field" value={dropId} onChange={(e) => setDropId(e.target.value)}>
                <option value="">Ingen</option>
                {drops.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Text (valfritt)">
              <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder={EVENT_TYPES[type].label} />
            </Field>
          )}
        </div>
        {dropLinked && dropId && type !== 'purchase' && <p className="m-0 text-[12px] text-muted">Läggs på dropen och fördelas på plaggen ({type === 'shipping' ? 'efter vikt' : 'efter inköpsvärde'}).</p>}
        {ds.settings.vatEnabled && (
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={vat} onChange={(e) => setVat(e.target.checked)} className="h-5 w-5" /> Beloppet inkluderar 25 % moms
          </label>
        )}
        <p className="m-0 text-[12px] text-muted">Verifikatet skapas åt dig: {EVENT_TYPES[type].label.toLowerCase()} på konto {EVENT_TYPES[type].account} mot företagskontot 1930.</p>
      </div>
    </Sheet>
  );
}

function TaskSheet({ onClose }: { onClose: () => void }) {
  const [t, setT] = useState('');
  const [date, setDate] = useState(todayISO());
  const [prio, setPrio] = useState<'hög' | 'medel' | 'låg'>('medel');
  const save = async () => {
    if (!t.trim()) return;
    if (await addTask(t.trim(), date, prio)) onClose();
  };
  return (
    <Sheet open onClose={onClose} title="Ny uppgift" footer={<button type="button" className="btn btn-primary mb-1 w-full" disabled={!t.trim()} onClick={save}>Lägg till</button>}>
      <div className="flex flex-col gap-3">
        <Field label="Vad ska göras?">
          <input className="field" value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dag">
            <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Prioritet">
            <Select value={prio} options={['hög', 'medel', 'låg'] as const} onChange={setPrio} labels={{ hög: 'Hög', medel: 'Medel', låg: 'Låg' }} />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}

export function DropSheet({ onClose }: { onClose: () => void }) {
  const ds = useData();
  const [name, setName] = useState(`Drop ${live(ds.drops).length + 1}`);
  const [date, setDate] = useState(todayISO());
  const [text, setText] = useState('');
  const [shipping, setShipping] = useState(0);
  const [customs, setCustoms] = useState(0);
  const rows = useMemo(() => parseLines(text), [text]);
  const total = rows.reduce((s, r) => s + r.cost, 0);
  const save = async () => {
    if (!rows.length) return;
    if (await createDrop({ name, date, shipping, customs, status: shipping ? 'hemma' : 'beställd' }, rows)) {
      toast(`${rows.length} plagg tillagda`);
      onClose();
    }
  };
  return (
    <Sheet open onClose={onClose} title="Ny drop" footer={<button type="button" className="btn btn-primary mb-1 w-full" disabled={!rows.length} onClick={save}>Skapa drop med {rows.length} plagg</button>}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Namn">
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Datum">
            <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Plagg, ett per rad" hint={'Pris sist på raden. "11x" först ger flera likadana. Kategori gissas eller skrivs efter semikolon.'}>
          <textarea className="field min-h-[150px]" value={text} onChange={(e) => setText(e.target.value)} placeholder={'11x Nudie jeans 132,19\nA&F tröja; Tröjor; 150\nBurberry t-shirt 215'} />
        </Field>
        {rows.length > 0 && (
          <div className="card p-3 text-[13px]">
            <div className="mb-1 font-semibold">
              {rows.length} plagg · {kr(total)}
            </div>
            {rows.slice(0, 8).map((r, i) => (
              <div key={i} className="flex justify-between gap-2 text-muted">
                <span className="truncate">
                  {r.name} <span className="opacity-70">· {r.category}</span>
                </span>
                <span className="num">{kr(r.cost, { decimals: true })}</span>
              </div>
            ))}
            {rows.length > 8 && <div className="text-muted">…och {rows.length - 8} till</div>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Frakt (valfritt)">
            <MoneyInput value={shipping} onCommit={setShipping} />
          </Field>
          <Field label="Tull (valfritt)">
            <MoneyInput value={customs} onCommit={setCustoms} />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}

function MailSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const d = text.trim() ? parseMail(text) : null;
  const save = async () => {
    if (!d) return;
    const ok = await addDraft({ source: 'mejl', title: d.title, eventType: d.eventType, amount: d.amount, date: d.date, rawText: text, platform: d.platform, confidence: d.confidence });
    if (ok) {
      toast('Utkastet ligger i godkännandekön');
      onClose();
      go('#/ekonomi/ko');
    }
  };
  return (
    <Sheet open onClose={onClose} title="Klistra in mejl" footer={<button type="button" className="btn btn-primary mb-1 w-full" disabled={!d} onClick={save}>Lägg i godkännandekön</button>}>
      <div className="flex flex-col gap-3">
        <Field label="Mejltext" hint="Kopiera hela mejlet från Vinted, Plick eller Doorzo. Inget bokförs förrän du godkänner det.">
          <textarea className="field min-h-[180px]" value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        {d && (
          <div className="card p-3 text-[14px]">
            <div className="font-semibold">{d.title}</div>
            <div className="text-muted">
              {EVENT_TYPES[d.eventType].label} · {kr(d.amount, { decimals: true })} · {d.date} · {d.source}
            </div>
            {d.confidence < 0.5 && <div className="mt-1 text-[12px] text-me">Osäker tolkning, kontrollera i kön innan du godkänner.</div>}
          </div>
        )}
      </div>
    </Sheet>
  );
}

export function parseQuickPrice(s: string) {
  return parseOre(s);
}
