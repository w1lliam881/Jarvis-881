// Egen pixelgrafik ritad som SVG. Inga externa bilder.

const HERO = [
  '....HHHH....',
  '...HHHHHH...',
  '...HSSSSH...',
  '...SESSES...',
  '...SSSSSS...',
  '....SMMS....',
  '..AAATTAAA..',
  '.SAATTTTAAS.',
  '.S.ATTTTA.S.',
  '...ATTTTA...',
  '...LL..LL...',
  '..BBB..BBB..',
];

const PALETTES: Record<string, Record<string, string>> = {
  skog: { H: '#6B3E1E', S: '#F2C9A0', E: '#1A1A1A', M: '#C46A5A', A: '#3E7B4F', T: '#9EDBB8', L: '#2B3A4A', B: '#4A2E16' },
  oken: { H: '#2B1F05', S: '#E8B98C', E: '#1A1A1A', M: '#C46A5A', A: '#C98B3E', T: '#FFE2A8', L: '#5A4630', B: '#3A2A14' },
  frost: { H: '#E8F2FA', S: '#F2D0B4', E: '#1A1A1A', M: '#C46A5A', A: '#5B7FA6', T: '#BFE3FF', L: '#2F4560', B: '#1F2E40' },
  vulkan: { H: '#1A0E0E', S: '#E8B08C', E: '#1A1A1A', M: '#C46A5A', A: '#8A3B22', T: '#FFB15C', L: '#3A1A14', B: '#200C08' },
  moln: { H: '#F4F1E6', S: '#F2C9A0', E: '#1A1A1A', M: '#C46A5A', A: '#8FB3D9', T: '#FFFFFF', L: '#5B6F8A', B: '#3E4C60' },
  slott: { H: '#E9B44C', S: '#F2C9A0', E: '#1A1A1A', M: '#C46A5A', A: '#3B3670', T: '#E9B44C', L: '#1A1838', B: '#100E24' },
};

export function Hero({ world = 'skog', size = 72, className }: { world?: string; size?: number; className?: string }) {
  const pal = PALETTES[world] ?? PALETTES.skog;
  const px = 12;
  return (
    <svg viewBox={`0 0 ${px} ${px}`} width={size} height={size} className={`pixel ${className ?? ''}`} role="img" aria-label="Din hjälte">
      {HERO.flatMap((row, y) =>
        [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={pal[c]} />)),
      )}
    </svg>
  );
}

/** En liten pixelö för världskartan. */
export function Island({ sky, ground, accent, locked, current, kind }: { sky: string; ground: string; accent: string; locked: boolean; current: boolean; kind: string }) {
  const w = 24;
  const h = 16;
  const rects: [number, number, number, number, string][] = [];
  // himmel
  rects.push([0, 0, w, h, locked ? '#2A2F2C' : sky]);
  // mark (trappform för pixelkänsla)
  rects.push([2, 11, 20, 5, locked ? '#3A403C' : ground]);
  rects.push([4, 10, 16, 1, locked ? '#3A403C' : ground]);
  rects.push([6, 9, 12, 1, locked ? '#3A403C' : ground]);
  const deco = locked ? '#4A514C' : accent;
  // dekor per värld
  if (kind === 'skog') {
    for (const x of [5, 10, 16]) {
      rects.push([x, 5, 3, 4, deco]);
      rects.push([x + 1, 3, 1, 2, deco]);
      rects.push([x + 1, 9, 1, 1, locked ? '#4A514C' : '#6B3E1E']);
    }
  } else if (kind === 'oken') {
    rects.push([8, 6, 8, 3, deco]);
    rects.push([10, 4, 4, 2, deco]);
    rects.push([18, 2, 3, 3, locked ? '#4A514C' : '#FFF3C4']);
  } else if (kind === 'frost') {
    rects.push([6, 4, 3, 5, deco]);
    rects.push([11, 2, 3, 7, deco]);
    rects.push([16, 5, 3, 4, deco]);
  } else if (kind === 'vulkan') {
    rects.push([8, 4, 8, 5, locked ? '#4A514C' : '#3A1A14']);
    rects.push([10, 2, 4, 2, locked ? '#4A514C' : '#3A1A14']);
    rects.push([11, 1, 2, 1, deco]);
    rects.push([11, 0, 1, 1, deco]);
  } else if (kind === 'moln') {
    rects.push([4, 4, 6, 2, deco]);
    rects.push([5, 3, 4, 1, deco]);
    rects.push([14, 6, 7, 2, deco]);
    rects.push([15, 5, 5, 1, deco]);
  } else {
    rects.push([8, 3, 8, 6, locked ? '#4A514C' : '#5A5490']);
    rects.push([8, 1, 2, 2, locked ? '#4A514C' : '#5A5490']);
    rects.push([14, 1, 2, 2, locked ? '#4A514C' : '#5A5490']);
    rects.push([11, 5, 2, 4, deco]);
    for (const [x, y] of [
      [2, 2],
      [20, 1],
      [18, 5],
      [4, 6],
    ])
      rects.push([x, y, 1, 1, '#FFFFFF']);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="pixel block h-auto w-full" aria-hidden>
      {rects.map(([x, y, rw, rh, f], i) => (
        <rect key={i} x={x} y={y} width={rw} height={rh} fill={f} />
      ))}
      {locked && (
        <g fill="#E9EEEA">
          <rect x={10} y={6} width={4} height={1} />
          <rect x={10} y={6} width={1} height={2} />
          <rect x={13} y={6} width={1} height={2} />
          <rect x={9} y={8} width={6} height={4} />
          <rect x={11.5} y={9} width={1} height={2} fill="#2A2F2C" />
        </g>
      )}
      {current && <rect x={0} y={0} width={w} height={h} fill="none" stroke="#E9B44C" strokeWidth={1} />}
    </svg>
  );
}

// ---------- Ljud (av som standard) ----------

let ctx: AudioContext | null = null;

export function chime(kind: 'quest' | 'level' = 'quest') {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const notes = kind === 'level' ? [523, 659, 784, 1047] : [659, 988];
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'square';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.06, ctx!.currentTime + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.001, ctx!.currentTime + i * 0.09 + 0.12);
      o.connect(g).connect(ctx!.destination);
      o.start(ctx!.currentTime + i * 0.09);
      o.stop(ctx!.currentTime + i * 0.09 + 0.13);
    });
  } catch {
    /* ljud är valfritt */
  }
}
