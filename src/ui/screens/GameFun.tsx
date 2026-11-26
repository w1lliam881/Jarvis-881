// Spelets roliga delar: säsongsbanner med partiklar, day streak med milstolpar, dagens kista och spontana uppdrag.
import { useMemo, useState } from 'react';
import { Check, Flame, Plus } from 'lucide-react';
import { addQuestTask, openDailyChest } from '../../data/actions';
import { useData } from '../../data/store';
import { live } from '../../domain/metrics';
import { todayISO } from '../../domain/dates';
import { STREAK_MILESTONES, bestStreak, chestOpened, chestReward, sideQuestsFor, type GameSeason } from '../../game/fun';
import { chime } from '../../game/pixel';
import { cx } from '../components/ui';
import { meKey } from '../me';
import { toast } from '../Boot';

const SUN = '#E9B44C';
const MINT = '#9EDBB8';
const MUTED = '#A9B5AE';
const INK = '#17201B';
const LINE = 'rgba(233,238,234,.15)';

/** Partiklar som faller eller svävar, efter säsong. Rör sig inte om man valt mindre rörelse. */
export function SeasonParticles({ season }: { season: GameSeason }) {
  const parts = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i * 0.73) % 9,
        dur: 7 + ((i * 13) % 7),
        size: season.particle === 'snö' ? 2 + (i % 3) : 4 + (i % 3),
      })),
    [season.particle],
  );
  const color = season.particle === 'snö' ? '#FFFFFF' : season.particle === 'blad' ? ['#E07B39', '#C2324A', '#E9B44C'] : season.particle === 'blommor' ? ['#F2B8C6', '#FFFFFF', '#F4D35E'] : ['#FFE2A8'];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden" aria-hidden>
      {parts.map((p, i) => (
        <i
          key={i}
          className={cx('absolute block', season.particle === 'eldflugor' ? 'game-float' : 'game-fall')}
          style={{
            left: `${p.left}%`,
            top: season.particle === 'eldflugor' ? `${20 + ((i * 29) % 70)}%` : '-8px',
            width: p.size,
            height: p.size,
            background: Array.isArray(color) ? color[i % color.length] : color,
            opacity: season.particle === 'snö' ? 0.85 : 0.9,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            boxShadow: season.particle === 'eldflugor' ? '0 0 6px #FFE2A8' : undefined,
          }}
        />
      ))}
    </div>
  );
}

export function SeasonBanner({ season }: { season: GameSeason }) {
  return (
    <div className="relative overflow-hidden border-2 px-4 py-3" style={{ borderColor: season.accent, background: `linear-gradient(90deg, ${season.sky}, #11161A)` }}>
      <SeasonParticles season={season} />
      <div className="relative">
        <div className="font-pixel text-[11px] uppercase tracking-wider" style={{ color: season.accent }}>
          {season.name}
        </div>
        <div className="mt-1 text-[13px] text-[#E9EEEA]">{season.tagline}</div>
      </div>
    </div>
  );
}

/** Day streak och milstolparna. */
export function StreakTrack({ streak }: { streak: number }) {
  const ds = useData();
  const best = bestStreak(ds.game.visits?.[meKey()] ?? []);
  const next = STREAK_MILESTONES.find((m) => m.days > streak);
  return (
    <div className="flex flex-col gap-3 border-2 p-3" style={{ borderColor: LINE, background: 'rgba(0,0,0,.25)' }}>
      <div className="flex items-center gap-3">
        <span className={cx('grid h-12 w-12 shrink-0 place-items-center', streak > 0 && 'bob')} style={{ background: streak ? '#3A1A0E' : '#1F2622', color: streak ? '#FF9A3C' : MUTED }}>
          <Flame size={26} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-pixel text-[16px]">{streak} {streak === 1 ? 'dag' : 'dagar'} i rad</div>
          <div className="text-[12px]" style={{ color: MUTED }}>
            {streak ? 'Kom in imorgon också, annars börjar den om.' : 'Kom in varje dag för att bygga en streak.'} Bästa: {best} dagar.
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {STREAK_MILESTONES.map((m) => {
          const ok = Math.max(best, streak) >= m.days;
          return (
            <div key={m.days} className="flex flex-1 flex-col items-center gap-1">
              <div className="h-2 w-full" style={{ background: ok ? '#FF9A3C' : streak >= m.days * 0.5 ? 'rgba(255,154,60,.35)' : 'rgba(255,255,255,.08)' }} />
              <span className="font-pixel text-[8px]" style={{ color: ok ? '#FF9A3C' : MUTED }}>
                {m.days}d
              </span>
              <span className="text-[10px]" style={{ color: ok ? SUN : MUTED }}>
                +{m.xp}
              </span>
            </div>
          );
        })}
      </div>
      {next && (
        <div className="text-[12px]" style={{ color: MUTED }}>
          {next.days - streak} dagar till "{next.name}" (+{next.xp} XP)
        </div>
      )}
    </div>
  );
}

/** Pixelkista, stängd eller öppen. */
function ChestArt({ open, gold }: { open: boolean; gold: boolean }) {
  const body = gold ? '#C99A2E' : '#8A5A2B';
  const band = gold ? '#FFE2A8' : '#E9B44C';
  return (
    <svg viewBox="0 0 20 16" width={72} height={58} className="pixel" aria-hidden>
      {open ? (
        <>
          <rect x={2} y={1} width={16} height={4} fill={body} />
          <rect x={2} y={1} width={16} height={1} fill={band} />
          <rect x={4} y={5} width={12} height={3} fill="#FFE2A8" opacity={0.9} />
          <rect x={6} y={3} width={2} height={2} fill="#FFF5D6" />
          <rect x={12} y={2} width={2} height={2} fill="#FFF5D6" />
        </>
      ) : (
        <>
          <rect x={2} y={4} width={16} height={4} fill={body} />
          <rect x={2} y={4} width={16} height={1} fill={band} />
        </>
      )}
      <rect x={2} y={8} width={16} height={7} fill={body} />
      <rect x={2} y={8} width={16} height={1} fill={band} />
      <rect x={2} y={14} width={16} height={1} fill="#4A2E16" />
      <rect x={9} y={8} width={2} height={3} fill={band} />
      <rect x={9.5} y={9} width={1} height={1} fill={INK} />
    </svg>
  );
}

export function DailyChest({ streak, season, sound }: { streak: number; season: GameSeason; sound: boolean }) {
  const ds = useData();
  const today = todayISO();
  const opened = chestOpened(ds.game, today);
  const reward = chestReward(today, streak);
  const got = ds.game.chests?.[today];
  const [anim, setAnim] = useState(false);
  const open = async () => {
    setAnim(true);
    const ok = await openDailyChest(meKey(), streak);
    if (ok) {
      if (sound) chime('quest');
      toast(`+${reward.xp} XP ur ${season.chestName.toLowerCase()}${reward.gold ? ' (guldkista!)' : ''}`, 'xp');
    }
    setTimeout(() => setAnim(false), 900);
  };
  return (
    <div className="flex items-center gap-4 border-2 p-3" style={{ borderColor: opened ? LINE : SUN, background: opened ? 'rgba(0,0,0,.25)' : 'rgba(233,180,76,.08)' }}>
      <div className={cx('relative shrink-0', !opened && 'chest-wiggle', anim && 'pop')}>
        <ChestArt open={opened} gold={reward.gold && opened} />
        {anim && (
          <span className="font-pixel xp-float absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px]" style={{ color: SUN }}>
            +{reward.xp} XP
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-pixel text-[11px]" style={{ color: SUN }}>
          {season.chestName}
        </div>
        <div className="mt-1 text-[13px] text-[#E9EEEA]">
          {opened ? `Öppnad${got?.by && got.by !== meKey() ? ` av ${got.by.split('@')[0]}` : ''}: +${got?.xp ?? reward.xp} XP. Ny kista imorgon.` : `En om dagen. Ju längre streak, desto mer XP (+${Math.min(20, streak * 2)} just nu).`}
        </div>
      </div>
      {!opened && (
        <button type="button" onClick={() => void open()} className="min-h-[44px] shrink-0 border-2 px-4 text-[13px] font-semibold" style={{ background: SUN, color: INK, borderColor: INK, boxShadow: `3px 3px 0 ${INK}` }}>
          Öppna
        </button>
      )}
    </div>
  );
}

/** Dagens spontana uppdrag: läggs i Att göra och ger extra XP när de bockas av där. */
export function SideQuests() {
  const ds = useData();
  const today = todayISO();
  const qs = sideQuestsFor(today);
  const tasks = live(ds.tasks).filter((t) => t.questKey && t.date === today);
  return (
    <div className="flex flex-col gap-2">
      {qs.map((q) => {
        const t = tasks.find((x) => x.questKey === q.key);
        return (
          <div key={q.key} className="flex items-center gap-3 border-2 p-3" style={{ borderColor: t?.done ? 'rgba(158,219,184,.45)' : LINE, background: 'rgba(0,0,0,.25)' }}>
            <div className="min-w-0 flex-1">
              <div className={cx('text-[15px] font-semibold', t?.done && 'line-through opacity-70')}>{q.title}</div>
              <div className="mt-0.5 text-[12px]" style={{ color: MUTED }}>
                {q.hint} · ca {q.minutes} min
              </div>
            </div>
            <span className="font-pixel shrink-0 text-[10px]" style={{ color: SUN }}>
              +{q.xp}
            </span>
            {t ? (
              <span className="flex min-h-[40px] shrink-0 items-center gap-1 px-2 text-[12px] font-semibold" style={{ color: t.done ? MINT : MUTED }}>
                {t.done ? (
                  <>
                    <Check size={14} aria-hidden /> Klart
                  </>
                ) : (
                  'I Att göra'
                )}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void addQuestTask(q).then((ok) => ok && toast('Lagt i Att göra. Bocka av där när det är gjort.'))}
                className="flex min-h-[40px] shrink-0 items-center gap-1 border-2 px-2.5 text-[12px] font-semibold"
                style={{ background: MINT, color: INK, borderColor: INK }}
                aria-label={`Lägg "${q.title}" i Att göra`}
              >
                <Plus size={14} aria-hidden /> Att göra
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Hur man får XP, kort. */
export function XpGuide({ xp }: { xp: { fromSales: number; fromQuests: number; fromTasks: number; fromStreak: number; fromChests: number; fromBadges: number; fromBosses: number } }) {
  const rows: [string, string, number][] = [
    ['Sålt plagg', '5 XP', xp.fromSales],
    ['Uppgift i Att göra', '10 XP (högst 6 om dagen)', xp.fromTasks],
    ['Spontant uppdrag', '15–35 XP', 0],
    ['Uppdrag från datan', '10–180 XP', xp.fromQuests],
    ['Dagens kista', '10–60 XP', xp.fromChests],
    ['Streak-milstolpe', '30–800 XP', xp.fromStreak],
    ['Badges och bossar', '20–320 och 300 XP', xp.fromBadges + xp.fromBosses],
  ];
  return (
    <div className="border-2 p-3 text-[13px]" style={{ borderColor: LINE, background: 'rgba(0,0,0,.25)' }}>
      {rows.map(([a, b, c]) => (
        <div key={a} className="flex items-baseline justify-between gap-2 py-0.5">
          <span>{a}</span>
          <span className="text-right" style={{ color: MUTED }}>
            {b}
            {c > 0 && <span style={{ color: SUN }}> · du: {c}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

