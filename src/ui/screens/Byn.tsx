import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, Clock, Music, RefreshCw, Terminal, VolumeX } from 'lucide-react';
import { store } from '../../data/store';
import { AGENTS, agentById, agoText, inlineParts, latestByAgent, mood, nextRun, parseMarkdown, stockholmParts, whenText, type AgentDef, type AgentId, type AgentRun } from '../../domain/agents';
import { AgentSprite, DOORS, House, Interior, Scenery, Snowfall, SPOTS, VH, VW, nodeAt, route as streetRoute, type Pt } from '../../game/village';
import { snowLevel, villageTheme, type VillageTheme } from '../../domain/season';
import { startXmasMusic, stopXmasMusic } from '../../game/music';
import { CouncilBar, CouncilPhone, PhoneButton } from './ByChat';
import { MarketerStudio } from './MarketerStudio';
import { ScoutSettings } from './ScoutSettings';
import { go, type Route } from '../router';
import { cx } from '../components/ui';

// Färger för spelsidan (samma gröna värld som resten av appen, fast mörkare)
const BG = '#0E1F18';
const PANEL = 'rgba(0,0,0,.22)';
const LINE = 'rgba(233,238,234,.14)';
const MUTED = '#A9B5AE';
const SUN = '#E9B44C';
const MINT = '#9EDBB8';

// ---------- Data ----------

export function useAgentRuns() {
  const b = store().backend;
  const [runs, setRuns] = useState<AgentRun[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    if (!b.agentRuns) {
      // Utan Supabase finns inga körningar. (Skärmbilder och förhandsvisning kan lägga in exempel.)
      try {
        setRuns(JSON.parse(sessionStorage.getItem('jarvis-agent-runs') ?? '[]') as AgentRun[]);
      } catch {
        setRuns([]);
      }
      return;
    }
    setBusy(true);
    try {
      setRuns(await b.agentRuns(150));
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setRuns((r) => r ?? []);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void load();
    const t = setInterval(() => document.visibilityState === 'visible' && void load(), 60000);
    const vis = () => document.visibilityState === 'visible' && void load();
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', vis);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { runs, err, busy, reload: load, shared: !!b.agentRuns };
}

function useNow(ms = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

// ---------- Jul och snö (20 november till julafton) och julmusiken ----------

function useVillageTheme(): VillageTheme & { snow: number } {
  const [now, setNow] = useState(() => new Date());
  const [opened] = useState(() => Date.now());
  useEffect(() => {
    // Snön lägger sig medan sidan är öppen: räkna om var femte sekund
    const t = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(t);
  }, []);
  const theme = villageTheme(now);
  return { ...theme, snow: snowLevel(theme, (now.getTime() - opened) / 1000) };
}

const MUSIC_KEY = 'jarvis-byn-musik';
/** Julmusiken: på som standard under julen, startar när du rör vid sidan, går att stänga av. */
function useXmasMusic(active: boolean) {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(MUSIC_KEY) !== 'av';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    if (!active || !on) {
      stopXmasMusic();
      return;
    }
    const start = () => startXmasMusic();
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('keydown', start, { once: true });
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      stopXmasMusic();
    };
  }, [active, on]);
  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(MUSIC_KEY, next ? 'på' : 'av');
    } catch {
      /* ingen lagring */
    }
    if (next) startXmasMusic();
    else stopXmasMusic();
  };
  return { on, toggle };
}

const RED = '#C2324A';

/** Girlang med blinkande ljus överst på sidan när jultemat är på. */
function Garland({ t }: { t: number }) {
  const colors = [RED, SUN, '#F4F1E6', '#6D8FB3'];
  return (
    <div className="pointer-events-none flex h-3 w-full overflow-hidden" aria-hidden style={{ background: 'repeating-linear-gradient(90deg,#1F5A44 0 10px,#174A38 10px 20px)' }}>
      {Array.from({ length: 60 }, (_, i) => (
        <i key={i} className="mx-[7px] mt-[3px] block h-[6px] w-[6px] shrink-0" style={{ background: colors[(i + t) % colors.length], opacity: (i + t) % 2 ? 1 : 0.55 }} />
      ))}
    </div>
  );
}

function useBlink(ms = 900) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const x = setInterval(() => setT((v) => v + 1), ms);
    return () => clearInterval(x);
  }, [ms]);
  return t;
}

const isNight = (now: Date) => {
  const h = stockholmParts(now).h;
  return h >= 22 || h < 6;
};
const isDusk = (now: Date) => {
  const h = stockholmParts(now).h;
  return h >= 17 && h < 22;
};

// ---------- Sidan ----------

export function Byn({ route }: { route: Route }) {
  const id = route.path[1];
  const data = useAgentRuns();
  const def = id ? agentById(id) : undefined;
  const theme = useVillageTheme();
  const music = useXmasMusic(theme.xmas);
  const blink = useBlink();
  return (
    <div className="min-h-dvh pb-[calc(150px+env(safe-area-inset-bottom))] lg:pb-16" style={{ background: theme.xmas ? '#0F1D17' : BG, color: '#E9EEEA' }}>
      {theme.xmas && <Garland t={blink} />}
      {def ? <HouseView def={def} data={data} theme={theme} /> : <Village data={data} theme={theme} music={music} />}
    </div>
  );
}

type Data = ReturnType<typeof useAgentRuns>;

function Village({ data, theme, music }: { data: Data; theme: ReturnType<typeof useVillageTheme>; music: ReturnType<typeof useXmasMusic> }) {
  const now = useNow();
  const runs = data.runs ?? [];
  const latest = useMemo(() => latestByAgent(runs), [runs]);
  const p = stockholmParts(now);
  const clock = `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`;
  const night = isNight(now);
  const day = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'][p.wd];
  const next = AGENTS.map((a) => ({ a, at: nextRun(a.schedule, now) }))
    .filter((x) => x.at)
    .sort((x, y) => x.at!.getTime() - y.at!.getTime())[0];

  return (
    <>
      <header className="px-5 pb-5 pt-[max(20px,env(safe-area-inset-top))] lg:px-8 lg:pt-8">
        <div className="mx-auto flex max-w-[1216px] flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-pixel text-[10px] uppercase tracking-wider" style={{ color: MINT }}>
              Agentbyn
            </div>
            <h1 className="m-0 mt-2 font-serif text-[30px] font-semibold leading-tight">{theme.xmas ? 'God jul från agentbyn' : 'Här bor dina agenter'}</h1>
            <p className="m-0 mt-1 max-w-[560px] text-[14px]" style={{ color: MUTED }}>
              {AGENTS.length} hus, {AGENTS.length} jobb. Tryck på ett hus för att gå in, se vad agenten har gjort och chatta i telefonen.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {theme.xmas && (
              <button
                type="button"
                onClick={music.toggle}
                className="font-pixel flex h-9 items-center gap-1.5 border-2 px-2.5 text-[9px]"
                style={{ borderColor: music.on ? RED : LINE, background: music.on ? 'rgba(194,50,74,.25)' : PANEL, color: music.on ? '#FFD6DC' : MUTED }}
                aria-pressed={music.on}
                title="Julmusiken spelar tyst i bakgrunden. Den startar när du rör vid sidan."
              >
                {music.on ? <Music size={13} aria-hidden /> : <VolumeX size={13} aria-hidden />} <span className="hidden sm:inline">{music.on ? 'Julmusik på' : 'Julmusik av'}</span><span className="sm:hidden">{music.on ? 'På' : 'Av'}</span>
              </button>
            )}
            <span className="font-pixel whitespace-nowrap rounded-none border-2 px-2.5 py-1.5 text-[10px]" style={{ borderColor: LINE, background: PANEL }}>
              {day} {clock} · {night ? 'natt' : isDusk(now) ? 'kväll' : 'dag'}
            </span>
            {data.shared && (
              <button type="button" onClick={() => void data.reload()} className="grid h-9 w-9 place-items-center border-2" style={{ borderColor: LINE, background: PANEL }} aria-label="Hämta det senaste">
                <RefreshCw size={15} className={data.busy ? 'animate-spin' : ''} aria-hidden />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 lg:px-8">

        {data.err && (
          <p className="m-0 border-2 p-3 text-[13px]" style={{ borderColor: '#F4A08F55', color: '#F4A08F' }}>
            Kunde inte hämta agenternas arbete: {data.err}
          </p>
        )}

        <div className="xl:hidden">
          <CouncilBar xmas={theme.xmas} />
        </div>

        <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,2.3fr)_minmax(320px,1fr)] xl:items-start xl:gap-x-6 xl:gap-y-6">
          <div className="xl:col-start-1 xl:row-start-1">
            <VillageScene now={now} latest={latest} theme={theme} />
            <p className="m-0 mt-2 text-[12px] sm:hidden" style={{ color: MUTED }}>
              Dra i sidled för att se hela byn.
            </p>
          </div>

          <div className="hidden xl:col-start-2 xl:row-start-1 xl:block">
            <CouncilPhone xmas={theme.xmas} embedded />
          </div>

          <div className="xl:col-start-1 xl:row-start-2">
            <PSection title="Invånarna" sub={next ? `Nästa i tur: ${next.a.name}, ${whenText(next.at!, now)}` : undefined}>
              <div className="grid gap-2 lg:grid-cols-2">
                {AGENTS.map((a) => (
                  <ResidentRow key={a.id} def={a} last={latest[a.id]} now={now} />
                ))}
              </div>
            </PSection>
          </div>

          <div className="xl:col-start-2 xl:row-start-2">
            <PSection title="Senaste i byn" sub="Det agenterna har gjort, nyast först.">
              {runs.length ? (
                <div className="flex flex-col gap-2">
                  {runs.slice(0, 6).map((r) => (
                    <FeedItem key={r.id} r={r} now={now} />
                  ))}
                </div>
              ) : (
                <Empty shared={data.shared} loading={data.runs == null} />
              )}
            </PSection>
          </div>
        </div>

        <HowTo />
      </div>
    </>
  );
}

function Empty({ shared, loading }: { shared: boolean; loading: boolean }) {
  if (loading) return <p className="m-0 text-[14px]" style={{ color: MUTED }}>Hämtar…</p>;
  return (
    <div className="border-2 p-4 text-[14px]" style={{ borderColor: LINE, background: PANEL, color: MUTED }}>
      {shared
        ? 'Tyst i byn än så länge. När en agent har jobbat syns det här.'
        : 'Agenternas arbete sparas i databasen och syns när du är inloggad i Jarvis.'}
    </div>
  );
}

function HowTo() {
  return (
    <div className="border-2 p-4 text-[13px] leading-relaxed" style={{ borderColor: LINE, background: PANEL, color: MUTED }}>
      <div className="mb-1 flex items-center gap-2 font-semibold text-[#E9EEEA]">
        <Terminal size={15} aria-hidden /> Så kallar du på dem
      </div>
      Agenterna jobbar i Claude, inte i appen, så Jarvis kostar fortfarande 0 kr. Öppna Jarvis-projektet i Claude och skriv
      {' '}
      <Code>/reminder</Code>, <Code>/advisor</Code>, <Code>/planner</Code>, <Code>/marketer</Code>, <Code>/noter</Code>, <Code>/reviewer</Code> eller <Code>/builder</Code> följt av vad du vill ha gjort.
      De som har ett schema jobbar av sig själva och skickar en notis till telefonen när de är klara. I varje hus finns en telefon där du kan skriva till agenten. Svaren kommer varannan timme mellan 08 och 22.
    </div>
  );
}

const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded-sm px-1 py-0.5 font-mono text-[12px] text-[#E9EEEA]" style={{ background: 'rgba(255,255,255,.08)' }}>
    {children}
  </code>
);

function PSection({ title, sub, children, right }: { title: string; sub?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-pixel m-0 text-[12px] leading-relaxed" style={{ color: SUN }}>
            {title}
          </h2>
          {sub && <p className="m-0 mt-1 text-[12px]" style={{ color: MUTED }}>{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

const MOOD_TEXT: Record<ReturnType<typeof mood>, string> = {
  jobbar: 'Jobbar nu',
  'nyss klar': 'Nyss klar',
  väntar: 'Väntar på dig',
  vilar: 'Ledig',
};

function MoodChip({ m }: { m: ReturnType<typeof mood> }) {
  const c = m === 'jobbar' ? SUN : m === 'nyss klar' ? MINT : MUTED;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: c }}>
      <i className={cx('h-1.5 w-1.5', m === 'jobbar' && 'animate-pulse')} style={{ background: c }} />
      {MOOD_TEXT[m]}
    </span>
  );
}

function ResidentRow({ def, last, now }: { def: AgentDef; last?: AgentRun; now: Date }) {
  const m = mood(def, last, now);
  const next = nextRun(def.schedule, now);
  return (
    <a href={`#/byn/${def.id}`} className="flex items-start gap-3 border-2 p-3 transition-colors hover:bg-black/30" style={{ borderColor: LINE, background: PANEL }}>
      <span className="grid h-14 w-14 shrink-0 place-items-center" style={{ background: def.wall }}>
        <AgentSprite def={def} size={44} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[15px] font-semibold">{def.name}</span>
          <span className="text-[12px]" style={{ color: MUTED }}>
            {def.title} · {def.house}
          </span>
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug text-[#D5DDD8]">{last ? last.summary : def.line}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: MUTED }}>
          <MoodChip m={m} />
          {last && <span>Senast {agoText(last.at, now)}</span>}
          <span className="inline-flex items-center gap-1">
            <Clock size={11} aria-hidden /> {next ? `Nästa ${whenText(next, now)}` : 'När du ber om det'}
          </span>
        </span>
      </span>
    </a>
  );
}

function FeedItem({ r, now }: { r: AgentRun; now: Date }) {
  const def = agentById(r.agent)!;
  return (
    <a href={`#/byn/${r.agent}`} className="block border-2 p-3 transition-colors hover:bg-black/30" style={{ borderColor: r.status === 'klar' ? LINE : r.status === 'varning' ? '#E9B44C55' : '#F4A08F66', background: PANEL }}>
      <div className="flex items-center gap-2">
        <AgentSprite def={def} size={22} />
        <span className="text-[13px] font-semibold">{def.name}</span>
        <span className="text-[11px]" style={{ color: MUTED }}>
          {agoText(r.at, now)}
          {r.trigger === 'schema' ? ' · enligt schema' : r.trigger === 'test' ? ' · testkörning' : ''}
        </span>
        {r.status !== 'klar' && (
          <span className="ml-auto text-[11px] font-semibold" style={{ color: r.status === 'varning' ? SUN : '#F4A08F' }}>
            {r.status === 'varning' ? 'Att göra' : 'Gick inte'}
          </span>
        )}
      </div>
      <div className="mt-1.5 text-[14px] font-semibold leading-snug">{r.title}</div>
      <div className="mt-0.5 text-[13px] leading-snug text-[#D5DDD8]">{r.summary}</div>
      {r.highlights.length > 0 && <Chips items={r.highlights} />}
    </a>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((h) => (
        <span key={h} className="px-2 py-0.5 text-[11px]" style={{ background: 'rgba(158,219,184,.12)', color: MINT }}>
          {h}
        </span>
      ))}
    </div>
  );
}

// ---------- Byn som spelvärld ----------

interface Walker {
  id: AgentId;
  pos: Pt;
  queue: Pt[];
  wait: number;
  flip: boolean;
  at: string; // nod där figuren står eller är på väg till
  home: boolean;
}

const SPEED = 11; // pixlar per sekund i byns mått

function VillageScene({ now, latest, theme }: { now: Date; latest: Partial<Record<AgentId, AgentRun>>; theme: ReturnType<typeof useVillageTheme> }) {
  const night = isNight(now);
  const dusk = isDusk(now);
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [tick, setTick] = useState(0);
  const [hover, setHover] = useState<AgentId | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const moods = useMemo(() => Object.fromEntries(AGENTS.map((a) => [a.id, mood(a, latest[a.id], now)])) as Record<AgentId, ReturnType<typeof mood>>, [latest, now]);
  const stayHome = (id: AgentId) => night || moods[id] === 'jobbar';
  const walkers = useRef<Walker[]>(
    AGENTS.map((a, i) => {
      const spot = SPOTS[i % SPOTS.length];
      return { id: a.id, pos: { ...nodeAt(spot) }, queue: [], wait: 1 + i * 0.7, flip: i % 2 === 1, at: spot, home: false };
    }),
  );

  useEffect(() => {
    let last = performance.now();
    const t = setInterval(() => {
      const nowT = performance.now();
      const dt = Math.min(0.25, (nowT - last) / 1000);
      last = nowT;
      for (const w of walkers.current) step(w, dt);
      setTick((x) => x + 1);
    }, 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [night, moods]);

  function step(w: Walker, dt: number) {
    const home = stayHome(w.id);
    const door = `d-${w.id}`;
    if (reduce) {
      // Ingen rörelse: stå still vid dörren eller på torget
      const target = home ? door : w.at;
      w.pos = { ...nodeAt(target) };
      w.home = home && target === door;
      return;
    }
    if (w.queue.length) {
      const to = w.queue[0];
      const dx = to.x - w.pos.x;
      const dy = to.y - w.pos.y;
      const dist = Math.hypot(dx, dy);
      const s = SPEED * dt;
      if (Math.abs(dx) > 0.2) w.flip = dx < 0;
      if (dist <= s) {
        w.pos = { ...to };
        w.queue.shift();
        if (!w.queue.length) w.wait = 2 + Math.random() * 5;
      } else {
        w.pos = { x: w.pos.x + (dx / dist) * s, y: w.pos.y + (dy / dist) * s };
      }
      w.home = false;
      return;
    }
    if (home) {
      if (w.at !== door) {
        w.queue = streetRoute(w.at, door);
        w.at = door;
      } else w.home = true;
      return;
    }
    w.home = false;
    w.wait -= dt;
    if (w.wait > 0) return;
    // Välj nästa mål: torget, dammen, hemma en stund eller hälsa på någon
    const r = Math.random();
    let target: string;
    if (r < 0.55) target = SPOTS[Math.floor(Math.random() * SPOTS.length)];
    else if (r < 0.75) target = door;
    else {
      const others = AGENTS.filter((a) => a.id !== w.id);
      target = `d-${others[Math.floor(Math.random() * others.length)].id}`;
    }
    if (target === w.at) {
      w.wait = 1.5;
      return;
    }
    w.queue = streetRoute(w.at, target);
    w.at = target;
  }

  // På smal skärm är byn bredare än skärmen: börja i mitten
  useEffect(() => {
    const el = scroller.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);
  const frame = Math.floor(tick / 2) % 3;
  const t = Math.floor(tick / 4);
  const ws = walkers.current;
  const sorted = [...ws].sort((a, b) => a.pos.y - b.pos.y);

  return (
    <div ref={scroller} className="relative select-none overflow-x-auto border-2 [scrollbar-width:none]" style={{ borderColor: theme.xmas ? 'rgba(194,50,74,.7)' : LINE, boxShadow: '0 0 0 4px rgba(0,0,0,.25)' }}>
      <div className="relative w-full min-w-[860px] md:min-w-0" style={{ aspectRatio: `${VW} / ${VH}` }}>
        <svg viewBox={`0 0 ${VW} ${VH}`} className="pixel absolute inset-0 h-full w-full" role="img" aria-label={`Agentbyn med ${AGENTS.length} hus och agenterna som går runt${theme.snowing ? ', medan snön faller' : ''}`}>
          <Scenery t={t} night={night} snow={theme.snow} xmas={theme.xmas} />
          {AGENTS.map((a) => {
            const w = ws.find((x) => x.id === a.id)!;
            return (
              <g key={a.id} className="cursor-pointer" onClick={() => go(`#/byn/${a.id}`)} onMouseEnter={() => setHover(a.id)} onMouseLeave={() => setHover(null)}>
                <House def={a} night={night || dusk} home={w.home} t={t} smoke={moods[a.id] === 'jobbar' || (a.id === 'noter' && !night) || (theme.snow > 0.3 && !night)} winter={theme.snow > 0.25} xmas={theme.xmas} />
              </g>
            );
          })}
          {sorted.map((w) => {
            if (w.home) return null;
            const def = agentById(w.id)!;
            const moving = w.queue.length > 0;
            return (
              <g
                key={w.id}
                transform={`translate(${(w.pos.x - 6.5).toFixed(2)} ${(w.pos.y - 13).toFixed(2)})`}
                className="cursor-pointer"
                onClick={() => go(`#/byn/${w.id}`)}
                onMouseEnter={() => setHover(w.id)}
                onMouseLeave={() => setHover(null)}
              >
                <rect x={2} y={12} width={9} height={1.5} fill="#00000040" />
                <AgentSprite def={def} frame={moving ? frame : 0} flip={w.flip} xmas={theme.xmas} />
              </g>
            );
          })}
          {/* kvällsljus och natt */}
          {dusk && <rect x={0} y={0} width={VW} height={VH} fill="#C97B5A" opacity={0.12} pointerEvents="none" />}
          {night && <rect x={0} y={0} width={VW} height={VH} fill="#0A1430" opacity={0.42} pointerEvents="none" />}
          {night && <NightLights t={t} />}
          {theme.snowing && !reduce && <Snowfall tick={tick} />}
        </svg>

        {/* Skyltar och pratbubblor ovanpå (vanlig text, skarp i alla storlekar) */}
        {AGENTS.map((a) => {
          const d = DOORS[a.id];
          return (
            <a
              key={a.id}
              href={`#/byn/${a.id}`}
              className={cx('font-pixel absolute -translate-x-1/2 whitespace-nowrap px-1.5 py-1 text-[7px] leading-none transition-transform sm:text-[9px]', hover === a.id && 'scale-110')}
              style={{ left: `${(d.x / VW) * 100}%`, top: `${((d.y + 1.5) / VH) * 100}%`, background: 'rgba(14,31,24,.82)', color: hover === a.id ? SUN : '#E9EEEA' } as CSSProperties}
            >
              {a.house}
            </a>
          );
        })}
        {ws.map((w) => {
          const b = bubble(w, moods[w.id], latest[w.id], night, t);
          if (!b) return null;
          const anchor = w.home ? { x: DOORS[w.id].x, y: DOORS[w.id].y - 9 } : { x: w.pos.x, y: w.pos.y - 14 };
          return (
            <div
              key={`b-${w.id}`}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap border-2 px-1.5 py-1 text-[10px] font-semibold leading-none sm:text-[12px]"
              style={{ left: `${(anchor.x / VW) * 100}%`, top: `${(anchor.y / VH) * 100}%`, background: '#F4F1E6', color: '#17201B', borderColor: '#17201B' }}
            >
              {b}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Vad figuren säger just nu, om något. */
function bubble(w: Walker, m: ReturnType<typeof mood>, last: AgentRun | undefined, night: boolean, t: number): string | null {
  if (night && w.home) return t % 6 < 3 ? 'z' : 'zZ';
  if (m === 'jobbar') return ['.', '..', '...'][t % 3];
  if (m === 'nyss klar' && last && !w.queue.length && (t + w.id.length) % 10 < 6) return last.highlights[0] ?? 'Klar!';
  return null;
}

function NightLights({ t }: { t: number }) {
  const stars: [number, number][] = [
    [12, 3],
    [70, 6],
    [118, 2],
    [140, 9],
    [186, 14],
    [50, 12],
  ];
  return (
    <g>
      {stars.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={1} height={1} fill="#FFFFFF" opacity={(t + i) % 4 === 0 ? 0.4 : 0.9} />
      ))}
    </g>
  );
}

// ---------- Ett hus inifrån ----------

function HouseView({ def, data, theme }: { def: AgentDef; data: Data; theme: ReturnType<typeof useVillageTheme> }) {
  const now = useNow();
  const [frame, setFrame] = useState(0);
  const runs = (data.runs ?? []).filter((r) => r.agent === def.id);
  const [open, setOpen] = useState<string | null>(null);
  const last = runs[0];
  const shown = runs.find((r) => r.id === open) ?? last;
  const next = nextRun(def.schedule, now);
  const m = mood(def, last, now);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % 2), 600);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [def.id]);

  return (
    <>
      <header className="px-5 pb-4 pt-[max(20px,env(safe-area-inset-top))] lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-[1216px]">
          <a href="#/byn" className="inline-flex min-h-[36px] items-center gap-1.5 text-[13px]" style={{ color: MUTED }}>
            <ArrowLeft size={15} aria-hidden /> Tillbaka till byn
          </a>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="font-pixel text-[10px] uppercase tracking-wider" style={{ color: MINT }}>
                {def.house}
              </div>
              <h1 className="m-0 mt-2 font-serif text-[30px] font-semibold leading-tight">
                {def.name} <span className="text-[20px] font-medium" style={{ color: MUTED }}>{def.title.toLowerCase()}</span>
              </h1>
              <p className="m-0 mt-1 max-w-[560px] text-[14px]" style={{ color: '#D5DDD8' }}>
                {def.line}
              </p>
            </div>
            <MoodChip m={m} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 lg:px-8">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-8">
          <div className="flex flex-col gap-6">
            <div className="border-2" style={{ borderColor: LINE, boxShadow: '0 0 0 4px rgba(0,0,0,.25)' }}>
              <Interior def={def} frame={frame} xmas={theme.xmas} />
            </div>
            <PSection title="Mitt jobb">
              <div className="border-2 p-4" style={{ borderColor: LINE, background: PANEL }}>
                <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[14px] leading-snug">
                  {def.job.map((j) => (
                    <li key={j} className="flex gap-2.5">
                      <i className="mt-[7px] h-1.5 w-1.5 shrink-0" style={{ background: SUN }} />
                      {j}
                    </li>
                  ))}
                </ul>
                <p className="m-0 mt-3 border-t pt-3 text-[13px]" style={{ borderColor: LINE, color: MUTED }}>
                  {def.never}
                </p>
              </div>
            </PSection>

            <PSection title="När jag jobbar">
              <div className="flex flex-col gap-2 border-2 p-4 text-[14px]" style={{ borderColor: LINE, background: PANEL }}>
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: MUTED }}>Schema</span>
                  <span className="font-semibold">{def.schedule ? def.schedule.label : 'Bara när du ber om det'}</span>
                </div>
                {next && (
                  <div className="flex items-center justify-between gap-3">
                    <span style={{ color: MUTED }}>Nästa gång</span>
                    <span className="font-semibold">{whenText(next, now)}</span>
                  </div>
                )}
                {def.schedule && (
                  <div className="flex items-center justify-between gap-3">
                    <span style={{ color: MUTED }}>Notis</span>
                    <span className="font-semibold">Till telefonen när jag är klar</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: MUTED }}>Kalla på mig</span>
                  <Code>{def.command}</Code>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: MUTED }}>Antal jobb</span>
                  <span className="font-semibold">{runs.length}</span>
                </div>
              </div>
            </PSection>

            {runs.length > 1 && (
              <PSection title="Tidigare jobb">
                <div className="flex flex-col">
                  {runs.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setOpen(r.id);
                        document.getElementById('rapport')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={cx('flex min-h-[48px] items-center gap-3 border-b px-1 py-2 text-left text-[13px] hover:bg-black/20')}
                      style={{ borderColor: LINE, color: shown?.id === r.id ? SUN : undefined }}
                    >
                      <span className="w-[88px] shrink-0" style={{ color: MUTED }}>
                        {agoText(r.at, now)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{r.title}</span>
                    </button>
                  ))}
                </div>
              </PSection>
            )}
          </div>

          <div className="flex flex-col gap-6">
          {def.id === 'marketer' && <MarketerStudio />}
          {def.id === 'scout' && <ScoutSettings />}
          <div id="rapport" className="scroll-mt-4">
            <PSection title={shown && shown !== last ? 'Äldre jobb' : 'Senaste jobbet'}>
              {shown ? (
                <article className="border-2 p-4 lg:p-5" style={{ borderColor: LINE, background: PANEL }}>
                  <div className="text-[12px]" style={{ color: MUTED }}>
                    {agoText(shown.at, now)}
                    {shown.trigger === 'schema' ? ' · enligt schema' : shown.trigger === 'test' ? ' · testkörning' : ' · du bad om det'}
                  </div>
                  <h3 className="m-0 mt-1 text-[18px] font-semibold leading-snug">{shown.title}</h3>
                  <p className="m-0 mt-1 text-[14px] leading-snug text-[#D5DDD8]">{shown.summary}</p>
                  {shown.highlights.length > 0 && <Chips items={shown.highlights} />}
                  {shown.body && (
                    <div className="mt-4 border-t pt-4" style={{ borderColor: LINE }}>
                      <Markdown src={shown.body} />
                    </div>
                  )}
                </article>
              ) : (
                <Empty shared={data.shared} loading={data.runs == null} />
              )}
            </PSection>
          </div>
          </div>
        </div>
      </div>
      <PhoneButton key={def.id} def={def} runs={runs} xmas={theme.xmas} />
    </>
  );
}

// ---------- Rapporttext ----------

function Inline({ s }: { s: string }) {
  return (
    <>
      {inlineParts(s).map((p, i) =>
        p.bold ? (
          <b key={i} className="font-semibold text-[#F4F1E6]">
            {p.text}
          </b>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function Markdown({ src }: { src: string }) {
  const blocks = useMemo(() => parseMarkdown(src), [src]);
  return (
    <div className="flex flex-col gap-3 text-[14px] leading-relaxed text-[#D5DDD8]">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'h':
            return b.level <= 1 ? null : (
              <h4 key={i} className={cx('m-0 font-semibold text-[#F4F1E6]', b.level === 2 ? 'mt-2 text-[15px]' : 'text-[14px]')}>
                <Inline s={b.text} />
              </h4>
            );
          case 'p':
            return (
              <p key={i} className="m-0">
                <Inline s={b.text} />
              </p>
            );
          case 'ul':
          case 'ol':
            return (
              <ul key={i} className="m-0 flex list-none flex-col gap-1.5 p-0">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="shrink-0 font-semibold" style={{ color: SUN, minWidth: b.kind === 'ol' ? 16 : 6 }}>
                      {b.kind === 'ol' ? `${j + 1}.` : <i className="mt-[9px] block h-1.5 w-1.5" style={{ background: MINT }} />}
                    </span>
                    <span>
                      <Inline s={it} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case 'table':
            return (
              <div key={i} className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      {b.head.map((h, j) => (
                        <th key={j} className="border-b px-2 py-1.5 text-left font-semibold" style={{ borderColor: LINE, color: MUTED }}>
                          <Inline s={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, k) => (
                          <td key={k} className="num border-b px-2 py-1.5" style={{ borderColor: 'rgba(233,238,234,.07)' }}>
                            <Inline s={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'hr':
            return <hr key={i} className="m-0 border-0 border-t" style={{ borderColor: LINE }} />;
        }
      })}
    </div>
  );
}
