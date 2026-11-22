import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { WORLDS, BOSS_HP, type World } from './engine';
import { Boss, Hero, Island, chime } from './pixel';

// Kartans noder: x i procent av bredden, y i pixlar. En slingrande väg uppifrån och ner.
const NODES = [
  { x: 24, y: 70 },
  { x: 72, y: 160 },
  { x: 30, y: 250 },
  { x: 74, y: 340 },
  { x: 26, y: 430 },
  { x: 68, y: 520 },
];
const MAP_H = 600;

function loadPos(): number {
  try {
    return Math.max(0, Math.min(5, Number(localStorage.getItem('jarvis-hero-pos') ?? '-1')));
  } catch {
    return -1;
  }
}

/** Världskartan där hjälten går mellan världarna. */
export function Overworld({ level, beaten, hits, sound, onSelect }: { level: number; beaten: Record<string, string>; hits: Record<string, string[]>; sound: boolean; onSelect: (w: World) => void }) {
  const unlocked = WORLDS.filter((w) => level >= w.unlockLevel).length - 1;
  const saved = loadPos();
  const start = saved >= 0 && saved <= unlocked ? saved : unlocked;
  const [at, setAt] = useState(start);
  const [pos, setPos] = useState({ x: NODES[start].x, y: NODES[start].y });
  const [walking, setWalking] = useState(false);
  const [frame, setFrame] = useState(0);
  const [flip, setFlip] = useState(false);
  const [msg, setMsg] = useState('');
  const raf = useRef<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => onSelect(WORLDS[start]), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Gånganimation: benen växlar medan hjälten rör sig
  useEffect(() => {
    if (!walking) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % 3), 140);
    return () => clearInterval(t);
  }, [walking]);

  useEffect(() => () => void (raf.current && cancelAnimationFrame(raf.current)), []);

  const walkTo = (target: number) => {
    if (walking || target === at) {
      onSelect(WORLDS[target]);
      return;
    }
    const w = WORLDS[target];
    if (level < w.unlockLevel) {
      setMsg(`${w.name} låses upp på nivå ${w.unlockLevel}`);
      setTimeout(() => setMsg(''), 2500);
      return;
    }
    // Gå nod för nod längs vägen
    const step = target > at ? 1 : -1;
    const path: number[] = [];
    for (let i = at + step; step > 0 ? i <= target : i >= target; i += step) path.push(i);
    const width = wrap.current?.clientWidth ?? 360;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setWalking(true);
    let from = { x: NODES[at].x, y: NODES[at].y };
    let idx = 0;
    const speed = 150; // pixlar per sekund
    const leg = () => {
      const to = NODES[path[idx]];
      const dxPx = ((to.x - from.x) / 100) * width;
      const dy = to.y - from.y;
      const dist = Math.hypot(dxPx, dy);
      const dur = reduce ? 1 : (dist / speed) * 1000;
      setFlip(dxPx < 0);
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        setPos({ x: from.x + (to.x - from.x) * k, y: from.y + dy * k });
        if (k < 1) raf.current = requestAnimationFrame(tick);
        else {
          from = { x: to.x, y: to.y };
          idx++;
          if (idx < path.length) leg();
          else {
            setWalking(false);
            setFrame(0);
            setAt(target);
            try {
              localStorage.setItem('jarvis-hero-pos', String(target));
            } catch {
              /* valfritt */
            }
            if (sound) chime('quest');
            onSelect(WORLDS[target]);
          }
        }
      };
      raf.current = requestAnimationFrame(tick);
    };
    leg();
  };

  const pathD = NODES.map((n) => `${n.x},${n.y}`).join(' ');
  return (
    <div ref={wrap} className="relative w-full select-none overflow-hidden border-2 border-[#E9EEEA]/15" style={{ height: MAP_H, background: 'repeating-linear-gradient(0deg, #1B2A22 0 8px, #1E2F26 8px 16px), #1B2A22' }}>
      {/* Grästuvor och stenar som pixeldekor */}
      <svg className="pixel pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 100 ${MAP_H}`} preserveAspectRatio="none" aria-hidden>
        {Array.from({ length: 40 }, (_, i) => (
          <rect key={i} x={(i * 37) % 100} y={(i * 83) % MAP_H} width={1.2} height={4} fill={i % 3 ? '#2E4A3A' : '#3A3F3A'} />
        ))}
        <polyline points={pathD} fill="none" stroke="#C9A86A" strokeWidth={3.2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.9} />
        <polyline points={pathD} fill="none" stroke="#8C7444" strokeWidth={1} strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
      </svg>
      {WORLDS.map((w, i) => {
        const locked = level < w.unlockLevel;
        const n = NODES[i];
        return (
          <button
            key={w.id}
            type="button"
            onClick={() => walkTo(i)}
            aria-label={locked ? `${w.name}, låst till nivå ${w.unlockLevel}` : `Gå till ${w.name}`}
            className="absolute flex w-[118px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${n.x}%`, top: n.y }}
          >
            <span className={`block w-full border-2 ${i === at ? 'border-[#E9B44C]' : 'border-black/40'}`}>
              <Island sky={w.sky} ground={w.ground} accent={w.accent} locked={locked} current={false} kind={w.id} />
            </span>
            <span className="font-pixel flex items-center gap-1 bg-black/55 px-1.5 py-0.5 text-[8px] text-[#E9EEEA]">
              {locked && <Lock size={9} aria-hidden />}
              {w.name}
              {beaten[w.boss.id] ? ' ✓' : ''}
            </span>
            {!locked && !beaten[w.boss.id] && (hits[w.boss.id]?.length ?? 0) > 0 && (
              <span className="flex gap-0.5" aria-label={`Boss ${BOSS_HP - (hits[w.boss.id]?.length ?? 0)} liv kvar`}>
                {Array.from({ length: BOSS_HP }, (_, k) => (
                  <i key={k} className="h-1.5 w-2.5" style={{ background: k < BOSS_HP - (hits[w.boss.id]?.length ?? 0) ? '#F28B82' : 'rgba(242,139,130,.25)' }} />
                ))}
              </span>
            )}
          </button>
        );
      })}
      {/* Hjälten */}
      <div className="pointer-events-none absolute z-10 -translate-x-1/2" style={{ left: `${pos.x}%`, top: pos.y - 74 }}>
        <div className={walking ? '' : 'bob'}>
          <Hero world={WORLDS[at].id} size={44} frame={walking ? frame : 0} flip={flip} />
        </div>
        <div className="mx-auto -mt-1 h-1.5 w-7 rounded-full bg-black/40" aria-hidden />
      </div>
      {msg && <div className="font-pixel absolute inset-x-4 top-3 z-20 bg-black/80 p-2 text-center text-[10px] text-[#E9B44C]">{msg}</div>}
      <div className="font-pixel absolute bottom-2 left-2 bg-black/55 px-2 py-1 text-[8px] text-[#A9B5AE]">Tryck på en värld för att gå dit</div>
    </div>
  );
}

const PARTICLES: Record<string, { color: string; anim: string }> = {
  skog: { color: '#9EDBB8', anim: 'fall-leaf' },
  oken: { color: '#FFE2A8', anim: 'drift' },
  frost: { color: '#FFFFFF', anim: 'fall-snow' },
  vulkan: { color: '#FFB15C', anim: 'rise' },
  moln: { color: '#FFFFFF', anim: 'drift' },
  slott: { color: '#E9B44C', anim: 'twinkle' },
};

/** Scenen i den värld hjälten står i: miljö, hjälte och världens boss. */
export function WorldScene({ world, bossHits, beaten, heroWorld }: { world: World; bossHits: number; beaten: boolean; heroWorld: string }) {
  const p = PARTICLES[world.id];
  return (
    <div className="relative h-[210px] overflow-hidden border-2 border-[#E9EEEA]/15" style={{ background: `linear-gradient(180deg, ${world.sky} 0%, ${world.sky} 55%, ${world.ground} 55%)` }}>
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute block h-1.5 w-1.5"
          style={{ left: `${(i * 53) % 100}%`, top: `${(i * 29) % 60}%`, background: p.color, opacity: 0.8, animation: `${p.anim} ${3 + (i % 4)}s linear ${i * 0.3}s infinite` }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-[45%]" style={{ background: `repeating-linear-gradient(90deg, rgba(0,0,0,.08) 0 12px, transparent 12px 24px)` }} aria-hidden />
      <div className="patrol absolute bottom-[38%] left-[8%]">
        <WalkingHero world={heroWorld} />
      </div>
      <div className={`absolute bottom-[38%] right-[10%] ${beaten ? '' : 'boss-idle'}`}>
        <Boss world={world.id} size={96} defeated={beaten} />
      </div>
      <div className="absolute right-[10%] top-3 flex flex-col items-end gap-1">
        <span className="font-pixel bg-black/55 px-1.5 py-0.5 text-[9px] text-[#E9EEEA]">{world.boss.name}</span>
        {!beaten && (
          <span className="flex gap-0.5">
            {Array.from({ length: BOSS_HP }, (_, k) => (
              <i key={k} className="h-2.5 w-4 border border-black/40" style={{ background: k < BOSS_HP - bossHits ? '#F28B82' : 'transparent' }} />
            ))}
          </span>
        )}
        {beaten && <span className="font-pixel bg-black/55 px-1.5 py-0.5 text-[9px] text-[#9EDBB8]">Besegrad</span>}
      </div>
      <div className="font-pixel absolute left-3 top-3 bg-black/55 px-1.5 py-0.5 text-[10px] text-[#E9EEEA]">{world.name}</div>
    </div>
  );
}

/** Hjälten i scenen går fram och tillbaka med gånganimation. */
function WalkingHero({ world }: { world: string }) {
  const [f, setF] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setF((x) => (x + 1) % 3), 180);
    return () => clearInterval(t);
  }, []);
  return <Hero world={world} size={84} frame={f} />;
}
