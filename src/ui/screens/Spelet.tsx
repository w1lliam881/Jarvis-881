import { useEffect, useMemo, useState } from 'react';
import { Flame, Lock, Swords, Trophy } from 'lucide-react';
import { store, useData } from '../../data/store';
import { updateSettings } from '../../data/actions';
import { todayISO } from '../../domain/dates';
import { BOSS_XP, TIER_NAMES, WORLDS, badges, bossStatus, generateQuests, questBoard, startGame, tierOf, xpInfo, type Quest } from '../../game/engine';
import { Hero, Island, chime } from '../../game/pixel';
import { Page, Toggle, cx } from '../components/ui';

const TIER_COLORS = ['#CD7F32', '#B8C0CA', '#E9B44C', '#7FD1E0', '#B9A2FF'];

export function Spelet() {
  const ds = useData();
  const today = todayISO();
  const s = ds.settings;
  const xp = useMemo(() => xpInfo(ds, today), [ds, today]);
  const board = useMemo(() => questBoard(generateQuests(ds, today)), [ds, today]);
  const bs = useMemo(() => badges(ds), [ds]);
  const [levelUp, setLevelUp] = useState<number | null>(null);

  useEffect(() => {
    if (s.gameStartedAt && xp.level > ds.game.seenLevel) {
      setLevelUp(xp.level);
      if (s.gameSound) chime('level');
      void store().save('Ny nivå', (d) => [{ game: { ...d.game, seenLevel: xp.level } }], { undoable: false });
    }
  }, [xp.level, ds.game.seenLevel, s.gameStartedAt, s.gameSound]);

  if (!s.gameEnabled)
    return (
      <Page>
        <div className="card p-5">
          <div className="font-semibold">Spelet är avstängt</div>
          <p className="text-[14px] text-muted">Slå på det för att få uppdrag och XP för verkligt arbete.</p>
          <button className="btn btn-primary" onClick={() => void updateSettings({ gameEnabled: true })}>
            Slå på spelet
          </button>
        </div>
      </Page>
    );
  if (!s.gameStartedAt)
    return (
      <div className="min-h-dvh bg-[#11161A] px-5 pb-32 pt-[max(24px,env(safe-area-inset-top))] text-[#E9EEEA]">
        <div className="mx-auto flex max-w-[560px] flex-col items-center gap-4 text-center">
          <Hero size={120} className="bob" />
          <h1 className="font-pixel text-[18px] leading-relaxed">Ett äventyr väntar</h1>
          <p className="text-[14px] text-[#A9B5AE]">Verkligt arbete ger XP: sålda plagg, bokföring i fas, klipp och smarta inköp. Allt du gjort hittills räknas inte, äventyret börjar idag.</p>
          <button
            className="btn btn-sun"
            onClick={() => void store().save('Spelet startat', (d) => [{ settings: { ...d.settings, gameStartedAt: new Date().toISOString() } }, { game: { ...d.game, badgeBaseline: startGame(d).baseline, seenLevel: 1 } }], { undoable: false })}
          >
            Starta äventyret
          </button>
        </div>
      </div>
    );

  const inLevel = xp.xp - xp.levelFloor;
  const span = xp.levelCeil - xp.levelFloor;
  const toNext = xp.next ? Math.max(0, 25 * (xp.next.unlockLevel - 1) ** 2 - xp.xp) : 0;
  const boss = bossStatus(ds, xp.world, xp.level, today);
  const hall = Object.entries(ds.game.completed)
    .sort((a, b) => (a[1].at < b[1].at ? 1 : -1))
    .slice(0, 12);
  const titles = WORLDS.filter((w) => xp.level >= w.unlockLevel).map((w) => w.title);

  return (
    <div className="min-h-dvh pb-32" style={{ background: '#11161A', color: '#E9EEEA' }}>
      <header className="relative overflow-hidden px-5 pb-6 pt-[max(20px,env(safe-area-inset-top))]" style={{ background: `linear-gradient(180deg, ${xp.world.sky}, #11161A)` }}>
        <div className="absolute inset-x-0 bottom-0 h-3" style={{ background: xp.world.ground }} aria-hidden />
        <div className="relative mx-auto flex max-w-[720px] items-end gap-4">
          <Hero world={xp.world.id} size={96} className="bob shrink-0" />
          <div className="min-w-0 flex-1 pb-3">
            <div className="font-pixel text-[10px] uppercase tracking-wider opacity-80">{xp.world.name}</div>
            <div className="font-pixel mt-1 text-[22px]">Nivå {xp.level}</div>
            <div className="mt-1 text-[13px] opacity-85">{ds.game.title ?? xp.world.title}</div>
            <div className="mt-2 h-3 overflow-hidden border-2 border-[#E9EEEA]/70 bg-black/40" role="progressbar" aria-valuenow={inLevel} aria-valuemax={span} aria-label="XP till nästa nivå">
              <i className="block h-full" style={{ width: `${(inLevel / Math.max(1, span)) * 100}%`, background: '#E9B44C' }} />
            </div>
            <div className="num mt-1 flex justify-between text-[11px] opacity-80">
              <span>{xp.xp} XP</span>
              <span>{xp.levelCeil - xp.xp} till nivå {xp.level + 1}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 pt-5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <PixelStat icon={<Flame size={16} aria-hidden />} label="Streak" value={`${xp.streak} d`} />
          <PixelStat icon={<Swords size={16} aria-hidden />} label="Uppdrag" value={String(Object.keys(ds.game.completed).length)} />
          <PixelStat icon={<Trophy size={16} aria-hidden />} label="Bossar" value={`${Object.keys(ds.game.bossesBeaten).length}/6`} />
        </div>

        <PSection title="Dagens uppdrag" sub="De tre viktigaste just nu. Klara uppdrag bockas av automatiskt.">
          {board.today.map((q) => (
            <QuestCard key={q.id} q={q} />
          ))}
          {!board.today.length && <p className="m-0 text-[14px] text-[#A9B5AE]">Inga dagsuppdrag. Allt är i fas, bra jobbat.</p>}
        </PSection>

        {board.week.length > 0 && (
          <PSection title="Veckans uppdrag">
            {board.week.map((q) => (
              <QuestCard key={q.id} q={q} />
            ))}
          </PSection>
        )}
        {board.month.length > 0 && (
          <PSection title="Månadens uppdrag">
            {board.month.map((q) => (
              <QuestCard key={q.id} q={q} />
            ))}
          </PSection>
        )}

        <PSection title={`Boss: ${xp.world.boss.name}`} sub={xp.world.boss.goal}>
          <div className="border-2 border-[#E9EEEA]/20 bg-black/30 p-3">
            {boss.beaten ? (
              <div className="font-pixel text-[12px] text-[#9EDBB8]">Besegrad!</div>
            ) : (
              <>
                <div className="h-4 overflow-hidden border-2 border-[#F28B82]/70 bg-black/40">
                  <i className="block h-full" style={{ width: `${(1 - boss.progress) * 100}%`, background: '#F28B82' }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[12px] text-[#A9B5AE]">
                  <span>{boss.label}</span>
                  <span>+{BOSS_XP} XP</span>
                </div>
              </>
            )}
          </div>
        </PSection>

        <PSection title="Världskartan" sub={xp.next ? `${toNext} XP kvar till ${xp.next.name}` : 'Alla världar upplåsta'}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {WORLDS.map((w) => {
              const locked = xp.level < w.unlockLevel;
              const cur = w.id === xp.world.id;
              const beaten = !!ds.game.bossesBeaten[w.boss.id];
              return (
                <div key={w.id} className={cx('border-2 p-1.5', cur ? 'border-[#E9B44C]' : 'border-[#E9EEEA]/15')}>
                  <Island sky={w.sky} ground={w.ground} accent={w.accent} locked={locked} current={cur} kind={w.id} />
                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <span className="font-pixel truncate text-[9px]">{w.name}</span>
                    {locked ? (
                      <span className="flex items-center gap-0.5 text-[11px] text-[#A9B5AE]">
                        <Lock size={10} aria-hidden /> Nv {w.unlockLevel}
                      </span>
                    ) : beaten ? (
                      <span className="text-[11px] text-[#9EDBB8]">✓</span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-[#A9B5AE]">{w.blurb}</div>
                </div>
              );
            })}
          </div>
        </PSection>

        <PSection title="Badges" sub="Kosmetiska. Påverkar aldrig dina siffror.">
          <div className="grid grid-cols-3 gap-2">
            {bs.map((b) => {
              const t = tierOf(b);
              return (
                <div key={b.id} className="border-2 p-2 text-center" style={{ borderColor: t ? TIER_COLORS[t - 1] : 'rgba(233,238,234,.12)' }}>
                  <div className="font-pixel text-[9px] leading-relaxed">{b.name}</div>
                  <div className="mt-1 text-[11px] text-[#A9B5AE]">{t ? TIER_NAMES[t - 1] : 'Låst'}</div>
                  <div className="num mt-0.5 text-[11px]">{b.fmt(b.value)}</div>
                  {t < 5 && <div className="mt-0.5 text-[10px] text-[#A9B5AE]">nästa {b.fmt(b.tiers[t])}</div>}
                </div>
              );
            })}
          </div>
        </PSection>

        {titles.length > 1 && (
          <PSection title="Titlar">
            <div className="flex flex-wrap gap-2">
              {titles.map((t) => (
                <button key={t} className={cx('min-h-[36px] border-2 px-3 text-[13px]', (ds.game.title ?? xp.world.title) === t ? 'border-[#E9B44C] text-[#E9B44C]' : 'border-[#E9EEEA]/20')} onClick={() => void store().save('Titel vald', (d) => [{ game: { ...d.game, title: t } }], { undoable: false })}>
                  {t}
                </button>
              ))}
            </div>
          </PSection>
        )}

        <PSection title="Hall of fame">
          {hall.length ? (
            hall.map(([k, c]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-[#E9EEEA]/10 py-2 text-[13px]">
                <span className="truncate">{c.title}</span>
                <span className="num shrink-0 text-[#E9B44C]">+{c.xp}</span>
              </div>
            ))
          ) : (
            <p className="m-0 text-[14px] text-[#A9B5AE]">Klara ditt första uppdrag så hamnar det här.</p>
          )}
        </PSection>

        <div className="rounded-xl bg-[#E9EEEA] px-4 text-[#17201B]">
          <Toggle label="Ljud" sub="Små pixelljud vid klara uppdrag och ny nivå" checked={s.gameSound} onChange={(v) => void updateSettings({ gameSound: v })} />
          <Toggle label="Visa spelet" sub="Stäng av för att dölja spelet helt" checked={s.gameEnabled} onChange={(v) => void updateSettings({ gameEnabled: v })} />
        </div>
        <p className="m-0 text-[12px] text-[#A9B5AE]">XP: 5 per sålt plagg, uppdrag 10–180, badge-nivåer 20–320, bossar {BOSS_XP}. Nivå = golvet av √(XP/25) + 1. Spelet föreslår aldrig priser.</p>
      </div>

      {levelUp && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 px-6" role="dialog" aria-modal="true" aria-label="Ny nivå" onClick={() => setLevelUp(null)}>
          <div className="pop flex flex-col items-center gap-3 border-4 border-[#E9B44C] bg-[#11161A] p-6 text-center">
            <Hero world={xp.world.id} size={110} className="bob" />
            <div className="font-pixel text-[20px] text-[#E9B44C]">Nivå {levelUp}!</div>
            {WORLDS.find((w) => w.unlockLevel === levelUp) && <div className="font-pixel text-[11px]">Ny värld: {WORLDS.find((w) => w.unlockLevel === levelUp)!.name}</div>}
            <button className="btn btn-sun mt-2" onClick={() => setLevelUp(null)}>
              Fortsätt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PixelStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border-2 border-[#E9EEEA]/15 bg-black/20 px-2 py-2.5">
      <div className="flex items-center justify-center gap-1 text-[#E9B44C]">{icon}</div>
      <div className="font-pixel mt-1 text-[13px]">{value}</div>
      <div className="text-[11px] text-[#A9B5AE]">{label}</div>
    </div>
  );
}

function PSection({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="font-pixel m-0 text-[12px] leading-relaxed text-[#E9B44C]">{title}</h2>
        {sub && <p className="m-0 mt-1 text-[12px] text-[#A9B5AE]">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function QuestCard({ q }: { q: Quest }) {
  return (
    <a href={q.route} className="block border-2 border-[#E9EEEA]/15 bg-black/25 p-3 active:bg-black/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold">{q.title}</div>
          <div className="mt-0.5 text-[12px] text-[#A9B5AE]">{q.detail}</div>
        </div>
        <span className="font-pixel shrink-0 text-[10px] text-[#E9B44C]">+{q.xp}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden bg-black/50">
          <i className="block h-full" style={{ width: `${(q.progress.cur / q.progress.target) * 100}%`, background: '#9EDBB8' }} />
        </div>
        <span className="num text-[11px] text-[#A9B5AE]">
          {q.progress.cur}/{q.progress.target}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-[#A9B5AE]">
        <span>{q.category}</span>
        <span>ca {q.minutes} min</span>
        <span>{q.benefit}</span>
        <span>{'★'.repeat(q.priority)}</span>
      </div>
    </a>
  );
}
