// Scouts inställningar i Hamnen: vad Scout ska leta efter på Doorzo, maxpris och referensbilder.
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ImagePlus, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { deleteSearch, saveScoutSearch } from '../../data/actions';
import { useData } from '../../data/store';
import { maxPriceFor } from '../../domain/calc';
import { history, live } from '../../domain/metrics';
import { kr, parseOre } from '../../domain/money';
import { todayISO } from '../../domain/dates';
import { CATEGORIES, type Category, type SearchSaved } from '../../domain/types';
import { downscaleImage, useMedia } from '../media';
import { toast } from '../Boot';

const INK = '#17201B';
const MINT = '#9EDBB8';
const SUN = '#E9B44C';
const MUTED = '#A9B5AE';
const LINE = 'rgba(233,238,234,.14)';
const PANEL = 'rgba(0,0,0,.22)';

const field = 'w-full border-2 px-3 py-2 text-[16px] text-[#E9EEEA] outline-none placeholder:text-[#7F8C85]';
const fieldStyle = { background: '#0A1712', borderColor: LINE } as const;

export function ScoutSettings() {
  const ds = useData();
  const list = live(ds.searches).filter((s) => s.scout);
  const [adding, setAdding] = useState(list.length === 0);
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-pixel m-0 text-[12px] leading-relaxed" style={{ color: SUN }}>
            Det här letar jag efter
          </h2>
          <p className="m-0 mt-1 text-[12px]" style={{ color: MUTED }}>
            Scout söker på Doorzo varje morgon 07:40 efter de här. Referensbilder gör att jag känner igen rätt plagg, till exempel tvätt, passform eller detaljer.
          </p>
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="flex min-h-[40px] shrink-0 items-center gap-1.5 border-2 px-3 text-[13px] font-semibold" style={{ background: SUN, color: INK, borderColor: INK }}>
            <Plus size={15} aria-hidden /> Ny sökning
          </button>
        )}
      </div>
      {adding && <SearchForm onDone={() => setAdding(false)} />}
      {list.map((s) => (
        <SearchCard key={s.id} s={s} />
      ))}
      {!list.length && !adding && (
        <p className="m-0 border-2 p-3 text-[13px]" style={{ borderColor: LINE, background: PANEL, color: MUTED }}>
          Inga sökningar än. Lägg till en så börjar Scout leta i morgon bitti.
        </p>
      )}
    </section>
  );
}

function SearchForm({ s, onDone }: { s?: SearchSaved; onDone: () => void }) {
  const ds = useData();
  const [query, setQuery] = useState(s?.query ?? '');
  const [category, setCategory] = useState<Category | ''>(s?.category ?? 'Jeans');
  const [max, setMax] = useState(s?.maxPrice ? String(s.maxPrice / 100) : '');
  const [size, setSize] = useState(s?.size ?? '');
  const [note, setNote] = useState(s?.note ?? '');
  const H = useMemo(() => history(ds, todayISO()), [ds]);
  const auto = category ? maxPriceFor(category, H, ds.settings)?.maxPrice ?? null : null;
  const save = async () => {
    if (!query.trim()) return toast('Skriv vad Scout ska söka efter', 'error');
    const id = await saveScoutSearch({ query: query.trim(), category: category || null, maxPrice: max.trim() ? parseOre(max) : null, size: size.trim(), note: note.trim(), paused: s?.paused ?? false }, s?.id);
    if (id) {
      toast(s ? 'Sökningen är ändrad' : 'Sökningen är sparad. Lägg gärna till referensbilder.');
      onDone();
    }
  };
  return (
    <div className="flex flex-col gap-3 border-2 p-3" style={{ borderColor: SUN, background: PANEL }}>
      <label className="flex flex-col gap-1 text-[12px]" style={{ color: MUTED }}>
        Vad ska Scout söka efter? (svenska går bra, Scout översätter)
        <input className={field} style={fieldStyle} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="t.ex. Levi's 501 vintage mörk tvätt" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-[12px]" style={{ color: MUTED }}>
          Kategori
          <select className={field} style={fieldStyle} value={category} onChange={(e) => setCategory(e.target.value as Category | '')}>
            <option value="">Alla</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px]" style={{ color: MUTED }}>
          Storlek eller mått
          <input className={field} style={fieldStyle} value={size} onChange={(e) => setSize(e.target.value)} placeholder="t.ex. W30–W33" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-[12px]" style={{ color: MUTED }}>
        Maxpris per plagg, före frakt och tull (kr)
        <input className={field} style={fieldStyle} inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} placeholder={auto ? `Tomt = ${kr(auto)} från dina krav` : 'Tomt = räknas från dina krav'} />
      </label>
      <label className="flex flex-col gap-1 text-[12px]" style={{ color: MUTED }}>
        Vad vill du ha och inte ha? (valfritt)
        <textarea className={`${field} min-h-[72px]`} style={fieldStyle} value={note} onChange={(e) => setNote(e.target.value)} placeholder="t.ex. bara made in USA, inga hål, gärna selvedge" />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="min-h-[44px] flex-1 border-2 text-[14px] text-[#E9EEEA]" style={{ borderColor: LINE }}>
          Avbryt
        </button>
        <button type="button" onClick={() => void save()} className="min-h-[44px] flex-1 border-2 text-[14px] font-semibold" style={{ background: MINT, color: INK, borderColor: INK }}>
          Spara
        </button>
      </div>
    </div>
  );
}

function SearchCard({ s }: { s: SearchSaved }) {
  const ds = useData();
  const [edit, setEdit] = useState(false);
  const media = useMedia('scout-ref', s.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const H = useMemo(() => history(ds, todayISO()), [ds]);
  const auto = s.category ? maxPriceFor(s.category, H, ds.settings)?.maxPrice ?? null : null;
  const max = s.maxPrice ?? auto;
  if (edit) return <SearchForm s={s} onDone={() => setEdit(false)} />;
  const addImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const left = 8 - media.items.length;
    if (left <= 0) return toast('Högst 8 referensbilder per sökning', 'error');
    const imgs: { data: string }[] = [];
    for (const f of [...files].slice(0, left)) {
      if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(f.type) && !/\.(jpe?g|png|webp|heic)$/i.test(f.name)) continue;
      try {
        imgs.push({ data: await downscaleImage(f, 640) });
      } catch {
        toast(`Kunde inte läsa ${f.name}`, 'error');
      }
    }
    if (await media.add(imgs)) toast(`${imgs.length} referensbild${imgs.length === 1 ? '' : 'er'} sparade`);
  };
  return (
    <div className="flex flex-col gap-2.5 border-2 p-3" style={{ borderColor: s.paused ? LINE : 'rgba(158,219,184,.35)', background: PANEL, opacity: s.paused ? 0.7 : 1 }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold">{s.query}</div>
          <div className="text-[12px]" style={{ color: MUTED }}>
            {[s.category ?? 'Alla kategorier', s.size, max ? `max ${kr(max)}${s.maxPrice ? '' : ' (från dina krav)'}` : null, s.paused ? 'pausad' : null].filter(Boolean).join(' · ')}
          </div>
          {s.note && <div className="mt-1 text-[13px] text-[#D5DDD8]">{s.note}</div>}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <IconBtn label={s.paused ? 'Starta sökningen igen' : 'Pausa sökningen'} onClick={() => void saveScoutSearch({ query: s.query, category: s.category ?? null, maxPrice: s.maxPrice ?? null, size: s.size ?? '', note: s.note ?? '', paused: !s.paused }, s.id)}>
            {s.paused ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />}
          </IconBtn>
          <IconBtn label="Ta bort sökningen" onClick={() => confirm(`Ta bort sökningen "${s.query}"?`) && void deleteSearch(s.id)}>
            <Trash2 size={15} aria-hidden />
          </IconBtn>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {media.items.map((m) => (
          <div key={m.id} className="relative h-20 w-20 border-2" style={{ borderColor: LINE }}>
            <img src={m.data} alt="Referensbild" className="h-full w-full object-cover" />
            <button type="button" onClick={() => void media.remove(m.id)} className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center border-2 text-[#E9EEEA]" style={{ background: '#2A1A1A', borderColor: INK }} aria-label="Ta bort bilden">
              <Trash2 size={12} aria-hidden />
            </button>
          </div>
        ))}
        {media.available ? (
          <button type="button" disabled={media.busy} onClick={() => fileRef.current?.click()} className="grid h-20 w-20 place-items-center border-2 border-dashed text-[11px]" style={{ borderColor: LINE, color: MUTED }}>
            <span className="flex flex-col items-center gap-1">
              <ImagePlus size={18} aria-hidden />
              {media.busy ? 'Sparar…' : 'Bild'}
            </span>
          </button>
        ) : (
          <p className="m-0 text-[12px]" style={{ color: MUTED }}>
            Referensbilder sparas i databasen och fungerar när du är inloggad.
          </p>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void addImages(e.target.files).then(() => (e.target.value = ''))} />
      </div>
      {media.err && <p className="m-0 text-[12px] text-[#F4A08F]">{media.err}</p>}
      <button type="button" onClick={() => setEdit(true)} className="self-start text-[13px] underline" style={{ color: MINT }}>
        Ändra sökningen
      </button>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="grid h-10 w-10 place-items-center border-2 text-[#E9EEEA]" style={{ borderColor: LINE }} aria-label={label} title={label}>
      {children}
    </button>
  );
}

