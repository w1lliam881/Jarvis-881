// Marketers studio: logga TikTok-klipp med kryss, och se vad som fungerar. Visas i Studion i Agentbyn.
import { useMemo, useState, type ReactNode } from 'react';
import { Link2, Plus } from 'lucide-react';
import { saveVideo } from '../../data/actions';
import { useData } from '../../data/store';
import { live } from '../../domain/metrics';
import { FORMATS, HOOKS, LENGTHS, MARKETER_MIN, formatStats, marketerState, parseTikTokUrl } from '../../domain/tiktok';
import { VIDEO_TYPES, type VideoPost, type VideoType } from '../../domain/types';
import { toast } from '../Boot';

const INK = '#17201B';
const MINT = '#9EDBB8';
const SUN = '#E9B44C';
const MUTED = '#A9B5AE';
const LINE = 'rgba(233,238,234,.14)';
const PANEL = 'rgba(0,0,0,.22)';

/** Hämtar rubrik och miniatyr för en TikTok-länk (TikToks öppna oEmbed). Siffror går inte att hämta så. */
async function tiktokInfo(url: string): Promise<{ title: string; thumb: string } | null> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = (await r.json()) as { title?: string; thumbnail_url?: string };
    return { title: (j.title ?? '').slice(0, 200), thumb: j.thumbnail_url ?? '' };
  } catch {
    return null;
  }
}

const today = () => new Date().toISOString().slice(0, 10);

interface Form {
  url: string;
  title: string;
  thumb: string;
  date: string;
  hour: number;
  type: VideoType;
  formats: string[];
  hook: string;
  lengthSec: number;
  views: string;
  likes: string;
  comments: string;
  shares: string;
  saves: string;
}

const empty = (): Form => ({ url: '', title: '', thumb: '', date: today(), hour: new Date().getHours(), type: 'Styling', formats: [], hook: '', lengthSec: 15, views: '', likes: '', comments: '', shares: '', saves: '' });

const fromVideo = (v: VideoPost): Form => ({
  url: v.url ?? '',
  title: v.title,
  thumb: v.thumb ?? '',
  date: v.postedAt.slice(0, 10),
  hour: new Date(v.postedAt).getHours(),
  type: v.type,
  formats: v.formats ?? [],
  hook: v.hook ?? '',
  lengthSec: v.lengthSec,
  views: v.views ? String(v.views) : '',
  likes: v.likes ? String(v.likes) : '',
  comments: v.comments ? String(v.comments) : '',
  shares: v.shares ? String(v.shares) : '',
  saves: v.saves ? String(v.saves) : '',
});

const num = (s: string) => Math.max(0, Math.round(parseFloat(s.replace(/\s/g, '').replace(',', '.')) || 0));

export function MarketerStudio() {
  const ds = useData();
  const st = marketerState(ds);
  const vids = useMemo(() => live(ds.videos).filter((v) => v.platform === 'TikTok').sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1)), [ds.videos]);
  const stats = useMemo(() => formatStats(vids), [vids]);
  const [f, setF] = useState<Form | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const open = (v?: VideoPost) => {
    setF(v ? fromVideo(v) : empty());
    setEditId(v?.id ?? null);
  };
  const onUrl = async (raw: string) => {
    if (!f) return;
    const parsed = parseTikTokUrl(raw);
    setF({ ...f, url: parsed?.url ?? raw });
    if (!parsed) return;
    setFetching(true);
    const info = await tiktokInfo(parsed.url);
    setFetching(false);
    if (info) setF((x) => (x ? { ...x, url: parsed.url, title: x.title || info.title, thumb: info.thumb } : x));
  };
  const save = async () => {
    if (!f) return;
    const at = new Date(`${f.date}T${String(f.hour).padStart(2, '0')}:00:00`);
    const ok = await saveVideo(
      {
        platform: 'TikTok',
        url: f.url || undefined,
        title: f.title,
        thumb: f.thumb || undefined,
        type: f.type,
        postedAt: at.toISOString(),
        formats: f.formats,
        hook: f.hook || undefined,
        lengthSec: f.lengthSec,
        views: num(f.views),
        likes: num(f.likes),
        comments: num(f.comments),
        shares: num(f.shares),
        saves: num(f.saves),
      },
      editId ?? undefined,
    );
    if (ok) {
      toast(editId ? 'Klippet är uppdaterat' : 'Klippet är loggat. Marketer läser det nästa runda.');
      setF(null);
    }
  };

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-pixel m-0 text-[12px] leading-relaxed" style={{ color: SUN }}>
            Dina TikToks
          </h2>
          <p className="m-0 mt-1 text-[12px]" style={{ color: MUTED }}>
            Kryssa i hur du gjorde klippet och fyll i siffrorna från TikTok-analysen efter ett par dagar.
          </p>
        </div>
        {!f && (
          <button type="button" onClick={() => open()} className="flex min-h-[44px] shrink-0 items-center gap-1.5 border-2 px-3 text-[13px] font-semibold" style={{ background: SUN, color: INK, borderColor: INK, boxShadow: `3px 3px 0 ${INK}` }}>
            <Plus size={16} aria-hidden /> Logga klipp
          </button>
        )}
      </div>

      <div className="border-2 p-3 text-[13px]" style={{ borderColor: st.ready ? 'rgba(158,219,184,.4)' : 'rgba(233,180,76,.45)', background: PANEL }}>
        {st.ready ? (
          <span style={{ color: MINT }}>Marketer har {st.withStats} klipp med siffror och jobbar varje kväll utifrån ditt eget innehåll.</span>
        ) : (
          <>
            <b className="text-[#F4F1E6]">Marketer väntar på dig.</b>{' '}
            <span style={{ color: '#D5DDD8' }}>
              {st.withStats} av {MARKETER_MIN} klipp med siffror. Den ger inga idéer förrän den sett hur du själv gör, så att råden passar ditt content.
            </span>
            <div className="mt-2 flex gap-1" aria-hidden>
              {Array.from({ length: MARKETER_MIN }, (_, i) => (
                <i key={i} className="block h-2.5 flex-1" style={{ background: i < st.withStats ? MINT : 'rgba(255,255,255,.1)' }} />
              ))}
            </div>
          </>
        )}
      </div>

      {f && (
        <div className="flex flex-col gap-4 border-2 p-4" style={{ borderColor: LINE, background: PANEL }}>
          <Q label="Länk till klippet (valfritt)">
            <div className="flex items-center gap-2">
              <Link2 size={16} aria-hidden style={{ color: MUTED }} />
              <input className="min-w-0 flex-1 border-2 bg-[#0A1712] px-3 py-2 text-[16px] text-[#E9EEEA]" style={{ borderColor: LINE }} value={f.url} placeholder="https://www.tiktok.com/@…/video/…" inputMode="url" onChange={(e) => setF({ ...f, url: e.target.value })} onBlur={(e) => void onUrl(e.target.value)} onPaste={(e) => void onUrl(e.clipboardData.getData('text'))} />
            </div>
            <span className="text-[12px]" style={{ color: MUTED }}>
              {fetching ? 'Hämtar rubriken från TikTok…' : 'Klistra in länken så hämtas rubrik och bild. Visningar och likes visar TikTok inte via länken, de fyller du i nedan.'}
            </span>
            {f.thumb && <img src={f.thumb} alt="" className="mt-1 h-24 w-auto self-start border-2 object-cover" style={{ borderColor: LINE }} />}
          </Q>
          <Q label="Rubrik eller kort beskrivning">
            <input className="border-2 bg-[#0A1712] px-3 py-2 text-[16px] text-[#E9EEEA]" style={{ borderColor: LINE }} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="t.ex. Levi's 501 från senaste dropen" />
          </Q>
          <div className="grid grid-cols-2 gap-3">
            <Q label="Dag">
              <input type="date" className="border-2 bg-[#0A1712] px-3 py-2 text-[16px] text-[#E9EEEA]" style={{ borderColor: LINE }} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
            </Q>
            <Q label="Ungefär klockan">
              <select className="border-2 bg-[#0A1712] px-3 py-2 text-[16px] text-[#E9EEEA]" style={{ borderColor: LINE }} value={f.hour} onChange={(e) => setF({ ...f, hour: +e.target.value })}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </Q>
          </div>
          <Q label="Vad gjorde du? Kryssa allt som stämmer">
            <Chips options={FORMATS} value={f.formats} onChange={(formats) => setF({ ...f, formats })} />
          </Q>
          <Q label="Hur börjar klippet?">
            <Chips options={HOOKS} value={f.hook ? [f.hook] : []} single onChange={(x) => setF({ ...f, hook: x[0] ?? '' })} />
          </Q>
          <Q label="Längd">
            <Chips options={LENGTHS.map((l) => l.label)} value={[LENGTHS.reduce((b, l) => (Math.abs(l.sec - f.lengthSec) < Math.abs(b.sec - f.lengthSec) ? l : b)).label]} single onChange={(x) => setF({ ...f, lengthSec: LENGTHS.find((l) => l.label === x[0])?.sec ?? f.lengthSec })} />
          </Q>
          <Q label="Typ av klipp">
            <Chips options={VIDEO_TYPES} value={[f.type]} single onChange={(x) => setF({ ...f, type: (x[0] as VideoType) ?? f.type })} />
          </Q>
          <Q label="Siffror (fyll i efter 1–2 dygn, går att ändra senare)">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(
                [
                  ['views', 'Visningar'],
                  ['likes', 'Likes'],
                  ['comments', 'Kommentarer'],
                  ['shares', 'Delningar'],
                  ['saves', 'Sparade'],
                ] as const
              ).map(([k, l]) => (
                <label key={k} className="flex flex-col gap-1 text-[12px]" style={{ color: MUTED }}>
                  {l}
                  <input className="border-2 bg-[#0A1712] px-2 py-2 text-[16px] text-[#E9EEEA]" style={{ borderColor: LINE }} inputMode="numeric" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
                </label>
              ))}
            </div>
          </Q>
          <div className="flex gap-2">
            <button type="button" onClick={() => void save()} className="flex min-h-[46px] flex-1 items-center justify-center border-2 text-[14px] font-semibold" style={{ background: MINT, color: INK, borderColor: INK }}>
              {editId ? 'Spara ändringar' : 'Spara klippet'}
            </button>
            <button type="button" onClick={() => setF(null)} className="min-h-[46px] border-2 px-4 text-[14px] text-[#E9EEEA]" style={{ borderColor: LINE }}>
              Avbryt
            </button>
          </div>
        </div>
      )}

      {stats.length > 0 && (
        <div className="border-2 p-3" style={{ borderColor: LINE, background: PANEL }}>
          <div className="mb-2 text-[13px] font-semibold text-[#F4F1E6]">Det här fungerar för dig (visningar mot ditt snitt)</div>
          <div className="flex flex-col gap-1.5">
            {stats.slice(0, 8).map((s) => (
              <div key={s.format} className="flex items-center gap-2 text-[13px]">
                <span className="w-[42%] shrink-0 truncate text-[#D5DDD8]">{s.format}</span>
                <span className="h-2.5 flex-1" style={{ background: 'rgba(255,255,255,.06)' }}>
                  <i className="block h-full" style={{ width: `${Math.min(100, s.vsAvg * 50)}%`, background: s.vsAvg >= 1 ? MINT : '#C97B5A' }} />
                </span>
                <span className="w-14 shrink-0 text-right tabular-nums" style={{ color: s.vsAvg >= 1 ? MINT : '#E09A7C' }}>
                  {s.vsAvg >= 1 ? '+' : ''}
                  {Math.round((s.vsAvg - 1) * 100)} %
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {vids.length > 0 && (
        <div className="flex flex-col border-2" style={{ borderColor: LINE, background: PANEL }}>
          {vids.slice(0, 12).map((v) => (
            <button key={v.id} type="button" onClick={() => open(v)} className="flex min-h-[56px] items-center gap-3 border-b px-3 py-2 text-left last:border-0 hover:bg-black/20" style={{ borderColor: LINE }}>
              {v.thumb ? <img src={v.thumb} alt="" className="h-10 w-8 shrink-0 object-cover" /> : <span className="h-10 w-8 shrink-0" style={{ background: 'rgba(255,255,255,.06)' }} />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] text-[#E9EEEA]">{v.title || v.type}</span>
                <span className="block truncate text-[12px]" style={{ color: MUTED }}>
                  {v.postedAt.slice(0, 10)} · {(v.formats ?? []).slice(0, 3).join(', ') || 'inga kryss'}
                </span>
              </span>
              <span className="shrink-0 text-right text-[12px]" style={{ color: v.views ? MINT : SUN }}>
                {v.views ? `${v.views.toLocaleString('sv-SE')} visn.` : 'Fyll i siffror'}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function Q({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-[#F4F1E6]">{label}</span>
      {children}
    </div>
  );
}

function Chips({ options, value, onChange, single }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void; single?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(single ? (on ? [] : [o]) : on ? value.filter((x) => x !== o) : [...value, o])}
            className="min-h-[38px] border-2 px-2.5 text-[13px]"
            style={{ background: on ? MINT : 'transparent', color: on ? INK : '#E9EEEA', borderColor: on ? INK : LINE }}
          >
            {on && !single ? '✓ ' : ''}
            {o}
          </button>
        );
      })}
    </div>
  );
}
