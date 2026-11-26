// Agentbyn: pixelgrafik för byn, husen, agenterna och husens insida. Ritad som SVG, inga bilder.
import type { ReactNode } from 'react';
import type { AgentDef, AgentId } from '../domain/agents';

// ---------- Figurerna ----------

const HATS: Record<AgentId, string[]> = {
  builder: ['....YYYY....', '...YYYYYY...', '..YYYYYYYY..'],
  reminder: ['....CCCC....', '...CCCCCC...', '...CCCCCCCC.'],
  advisor: ['.....PP.....', '....PZPP....', '..PPPPPPPP..'],
  noter: ['............', '...BBBBB....', '..BBBBBBB...'],
  reviewer: ['............', '...KKKKKK...', '...KKKKKK...'],
  planner: ['............', '...NNNNNN...', '..NNNNNNNN..'],
  marketer: ['............', '...QQQQQ....', '...QQQQQQQQ.'],
  scout: ['....UUUU....', '...UUUUUU...', '.UUUUUUUUUU.'],
};

/** Tomteluva när jultemat är på. */
const HAT_XMAS = ['........rw..', '...rrrrrr...', '..wwwwwwww..'];

const FACE = ['...SSSSSS...', '...SESSES...', '...SSSSSS...', '....SMMS....'];
const FACE_GLASSES = ['...SSSSSS...', '...GEGGEG...', '...SSSSSS...', '....SMMS....'];
const BODY = ['..TTTTTTTT..', '.STTTTTTTTS.', '.S.TTWWTT.S.', '...TTTTTT...'];
const LEGS = [
  ['...LL..LL...', '..FFF..FFF..'],
  ['....LLLL....', '...FF..FF...'],
  ['..LL....LL..', '.FFF....FFF.'],
];

/** En agent som pixelfigur. frame växlar benen när den går. */
export function AgentSprite({ def, frame = 0, flip = false, size, className, xmas = false }: { def: AgentDef; frame?: number; flip?: boolean; size?: number; className?: string; xmas?: boolean }) {
  const c = def.colors;
  const pal: Record<string, string> = {
    Y: c.hat, C: c.hat, P: c.hat, B: c.hat, K: c.hat, N: c.hat, Q: c.hat, U: c.hat, Z: c.trim,
    S: '#F2C9A0', E: '#1A1A1A', M: '#C46A5A', G: c.trim,
    T: c.shirt, W: c.trim, L: c.pants, F: '#2A1A0E',
    r: '#C2324A', w: '#F4F1E6',
  };
  const rows = [...(xmas ? HAT_XMAS : HATS[def.id]), ...(def.id === 'reviewer' ? FACE_GLASSES : FACE), ...BODY, ...LEGS[frame % 3]];
  const rects: ReactNode[] = [];
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== '.') rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={pal[ch]} />);
    }),
  );
  // Sak i handen
  const item: Record<AgentId, ReactNode> = {
    builder: (
      <g key="item">
        <rect x={11} y={6} width={1} height={4} fill="#6B3E1E" />
        <rect x={10} y={5} width={3} height={2} fill="#8A9690" />
      </g>
    ),
    reminder: (
      <g key="item">
        <rect x={11} y={7} width={2} height={2} fill="#E9B44C" />
        <rect x={11.5} y={9} width={1} height={1} fill="#8A5A0B" />
      </g>
    ),
    advisor: (
      <g key="item">
        <rect x={11} y={4} width={1} height={7} fill="#6B3E1E" />
        <rect x={10.5} y={3} width={2} height={2} fill="#9EDBB8" />
      </g>
    ),
    noter: (
      <g key="item">
        <rect x={10} y={8} width={3} height={3} fill="#F4F1E6" />
        <rect x={10} y={8} width={1} height={3} fill="#C97B5A" />
      </g>
    ),
    reviewer: (
      <g key="item">
        <rect x={10} y={6} width={3} height={3} fill="none" stroke="#9EDBB8" strokeWidth={0.8} />
        <rect x={12.4} y={8.6} width={1} height={2} fill="#6B3E1E" />
      </g>
    ),
    planner: (
      <g key="item">
        <rect x={10} y={7} width={3} height={4} fill="#F4F1E6" />
        <rect x={10.5} y={6.5} width={2} height={1} fill="#6B3E1E" />
        <rect x={10.5} y={8.5} width={2} height={0.5} fill="#2C5D8A" />
        <rect x={10.5} y={9.7} width={1.5} height={0.5} fill="#2C5D8A" />
      </g>
    ),
    marketer: (
      <g key="item">
        <rect x={11} y={5} width={2} height={4} fill="#1A1A1A" />
        <rect x={11.4} y={5.5} width={1.2} height={2.6} fill="#25F4EE" />
      </g>
    ),
    scout: (
      <g key="item">
        {/* kikare */}
        <rect x={10} y={6} width={3} height={2} fill="#2B3A4A" />
        <rect x={12.5} y={6.2} width={1} height={1.6} fill="#BFE3FF" />
      </g>
    ),
  };
  const body = (
    <g transform={flip ? 'translate(13 0) scale(-1 1)' : undefined}>
      {rects}
      {item[def.id]}
    </g>
  );
  if (size == null) return body;
  return (
    <svg viewBox="-0.5 0 14 13" width={size} height={(size * 13) / 14} className={`pixel ${className ?? ''}`} aria-hidden>
      {body}
    </svg>
  );
}

// ---------- Byn ----------

export const VW = 320;
export const VH = 208;

export interface Pt {
  x: number;
  y: number;
}

/** Var husen ritades från början (deras ritningar använder de här koordinaterna). */
const OLD_DOORS: Partial<Record<AgentId, Pt>> = {
  reminder: { x: 33, y: 41 },
  builder: { x: 96, y: 41 },
  advisor: { x: 160, y: 41 },
  noter: { x: 36, y: 99 },
  reviewer: { x: 158, y: 99 },
  marketer: { x: 74, y: 99 },
  planner: { x: 122, y: 99 },
};

/** Husens dörrar i den större byn (där figurerna går in och ut). */
export const DOORS: Record<AgentId, Pt> = {
  reminder: { x: 36, y: 58 },
  planner: { x: 112, y: 58 },
  builder: { x: 204, y: 58 },
  advisor: { x: 282, y: 58 },
  noter: { x: 40, y: 128 },
  marketer: { x: 110, y: 128 },
  reviewer: { x: 284, y: 128 },
  scout: { x: 250, y: 186 },
};

/** Gatornas mittlinjer */
const NY = 61; // Storgatan (norra)
const SY = 131; // Strandgatan (södra)
const HY = 189; // Hamnvägen
const WX = 87; // Västra gränd
const MX = 160; // Torggatan (genom torget, ner till hamnen)
const EX = 239; // Östra gränd

/** Gatunätet som figurerna går på. */
const NODES: Record<string, Pt> = {
  ...Object.fromEntries(Object.entries(DOORS).map(([k, v]) => [`d-${k}`, v])),
  ...Object.fromEntries(Object.entries(DOORS).map(([k, v]) => [`c-${k}`, { x: v.x, y: v.y === 58 ? NY : v.y === 128 ? SY : HY }])),
  nw: { x: WX, y: NY },
  nm: { x: MX, y: NY },
  ne: { x: EX, y: NY },
  sw: { x: WX, y: SY },
  sm: { x: MX, y: SY },
  se: { x: EX, y: SY },
  hm: { x: MX, y: HY },
  // torget
  t0: { x: MX, y: 74 },
  t1: { x: 138, y: 80 },
  t2: { x: 182, y: 80 },
  t3: { x: 138, y: 112 },
  t4: { x: 182, y: 112 },
  t5: { x: MX, y: 118 },
  // parken i öster och dammen
  pk: { x: EX, y: 96 },
  pk1: { x: 214, y: 100 },
  pk2: { x: 262, y: 92 },
  // torghandeln och skogen i väster
  mk: { x: WX, y: 158 },
  mk1: { x: 58, y: 160 },
  mk2: { x: 118, y: 160 },
  // hamnen och Hamnvägen västerut
  pier: { x: 292, y: HY },
  hw: { x: WX, y: HY },
  bak: { x: 70, y: HY },
  kyr: { x: 128, y: HY },
};

const EDGES: [string, string][] = [
  // dörrar till gatan
  ...(Object.keys(DOORS) as AgentId[]).map((k): [string, string] => [`d-${k}`, `c-${k}`]),
  // Storgatan väst till öst
  ['c-reminder', 'nw'],
  ['nw', 'c-planner'],
  ['c-planner', 'nm'],
  ['nm', 'c-builder'],
  ['c-builder', 'ne'],
  ['ne', 'c-advisor'],
  // Strandgatan
  ['c-noter', 'sw'],
  ['sw', 'c-marketer'],
  ['c-marketer', 'sm'],
  ['sm', 'se'],
  ['se', 'c-reviewer'],
  // gränderna mellan gatorna
  ['nw', 'sw'],
  ['ne', 'pk'],
  ['pk', 'se'],
  ['pk', 'pk1'],
  ['pk', 'pk2'],
  // torget
  ['nm', 't0'],
  ['t0', 't1'],
  ['t0', 't2'],
  ['t1', 't3'],
  ['t2', 't4'],
  ['t3', 't5'],
  ['t4', 't5'],
  ['t5', 'sm'],
  // söderut: torghandeln och hamnen
  ['sw', 'mk'],
  ['mk', 'mk1'],
  ['mk', 'mk2'],
  ['sm', 'hm'],
  ['hm', 'c-scout'],
  ['c-scout', 'pier'],
  ['mk', 'hw'],
  ['hw', 'bak'],
  ['hw', 'kyr'],
  ['kyr', 'hm'],
];

const ADJ: Record<string, string[]> = {};
for (const [a, b] of EDGES) {
  (ADJ[a] ??= []).push(b);
  (ADJ[b] ??= []).push(a);
}

/** Kortaste vägen mellan två platser i byn (antal gatstumpar). */
export function route(from: string, to: string): Pt[] {
  const prev: Record<string, string | null> = { [from]: null };
  const q = [from];
  while (q.length) {
    const n = q.shift()!;
    if (n === to) break;
    for (const m of ADJ[n] ?? []) if (!(m in prev)) (prev[m] = n), q.push(m);
  }
  if (!(to in prev)) return [NODES[to]];
  const path: string[] = [];
  for (let n: string | null = to; n; n = prev[n]) path.unshift(n);
  return path.slice(1).map((k) => NODES[k]);
}

export const SPOTS = ['t1', 't2', 't3', 't4', 'pk1', 'pk2', 'mk1', 'mk2', 'pier', 'bak', 'kyr'];
export const nodeAt = (k: string): Pt => NODES[k];

type R = [number, number, number, number, string];

function rects(list: R[], key: string) {
  return list.map(([x, y, w, h, f], i) => <rect key={`${key}${i}`} x={x} y={y} width={w} height={h} fill={f} />);
}

/** Pseudoslump som blir likadan varje gång (gräs, blommor, snö). */
function seeded(n: number) {
  let s = n;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const SNOW = '#F2F6F8';
const SNOW_SHADE = '#D6E1E8';
const ROAD = '#C9A46A';
const ROAD_EDGE = '#A8834C';
const GRASS = '#2f6b4a';

/** Gatorna som rektanglar (också för snön som läggs lättare på gatorna). */
const ROADS: R[] = [
  [8, NY - 3, 304, 6, ROAD],
  [8, SY - 3, 304, 6, ROAD],
  [8, HY - 3, 300, 6, ROAD],
  [WX - 3, NY, 6, SY - NY, ROAD],
  [EX - 3, NY, 6, SY - NY, ROAD],
  [MX - 3, SY, 6, HY - SY, ROAD],
  [MX - 3, NY, 6, 10, ROAD],
  // stumpar till dörrarna
  ...(Object.values(DOORS).map((d) => [d.x - 3, d.y - 1, 6, 4, ROAD]) as R[]),
];

/**
 * Snödrivor: snön lägger sig i drivor som växer utåt från en mittpunkt (vid husväggar, träd och kanter),
 * och gatorna får snö sist. level 0–1 avgör hur långt drivorna har växt.
 */
const SNOW_PATCHES: R[] = (() => {
  const r = seeded(91);
  const onRoad = (x: number, y: number) => ROADS.some(([rx, ry, rw, rh]) => x >= rx - 1 && x <= rx + rw && y >= ry - 1 && y <= ry + rh);
  const items: [number, R][] = [];
  for (let c = 0; c < 90; c++) {
    const cx = r() * VW;
    const cy = 8 + r() * 184;
    const size = 6 + r() * 14;
    const road = onRoad(cx, cy);
    for (let k = 0; k < 18; k++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * size;
      const x = Math.round(cx + Math.cos(a) * d * 1.6);
      const y = Math.round(cy + Math.sin(a) * d * 0.6);
      if (y < 7 || y > 190 || x < 0 || x > VW - 2) continue;
      const w = 3 + Math.floor(r() * 5);
      const tone = d / size > 0.75 ? SNOW_SHADE : SNOW;
      // ordning: närmast mitten först, gatorna senare
      items.push([d / size + (road || onRoad(x, y) ? 1.2 : 0) + r() * 0.25 + c * 0.001, [x, y, w, 2, tone]]);
    }
  }
  return items.sort((a, b) => a[0] - b[0]).map((x) => x[1]);
})();

function Ground({ level }: { level: number }) {
  const r = seeded(7);
  const tufts: R[] = [];
  for (let i = 0; i < 420; i++) tufts.push([Math.floor(r() * VW), Math.floor(r() * 194), 1, 1, r() > 0.5 ? '#3d7d58' : '#255a3e']);
  const flowers: R[] = [];
  const fc = ['#E9B44C', '#F4F1E6', '#C97B5A', '#8FB0D6'];
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * VW);
    const y = Math.floor(r() * 190);
    if (ROADS.some(([rx, ry, rw, rh]) => x >= rx - 2 && x <= rx + rw + 2 && y >= ry - 2 && y <= ry + rh + 2)) continue;
    flowers.push([x, y, 1, 1, fc[i % 4]]);
  }
  const edges: R[] = [
    [8, NY + 3, 304, 1, ROAD_EDGE],
    [8, SY + 3, 304, 1, ROAD_EDGE],
    [8, HY + 3, 300, 1, ROAD_EDGE],
    [WX - 3, NY + 3, 1, SY - NY - 6, ROAD_EDGE],
    [WX + 3, NY + 3, 1, SY - NY - 6, ROAD_EDGE],
    [EX - 3, NY + 3, 1, SY - NY - 6, ROAD_EDGE],
    [EX + 3, NY + 3, 1, SY - NY - 6, ROAD_EDGE],
    [MX - 3, SY + 3, 1, HY - SY - 6, ROAD_EDGE],
    [MX + 3, SY + 3, 1, HY - SY - 6, ROAD_EDGE],
  ];
  // Kullersten på gatorna
  const cobbles: R[] = [];
  for (const [rx, ry, rw, rh] of ROADS.slice(0, 6))
    for (let y = ry + 1; y < ry + rh - 1; y += 2) for (let x = rx + ((y + 1) % 4 === 0 ? 1 : 3); x < rx + rw - 1; x += 5) cobbles.push([x, y, 2, 1, '#B8935A']);
  // Torget med mönster
  const plaza: R[] = [[124, 68, 72, 56, '#BFA27A']];
  for (let y = 69; y < 123; y += 3) for (let x = 125 + ((y / 3) % 2 ? 1 : 0); x < 195; x += 4) plaza.push([x, y, 2, 1, '#A8885E']);
  plaza.push([124, 68, 72, 1, ROAD_EDGE], [124, 123, 72, 1, ROAD_EDGE], [124, 68, 1, 56, ROAD_EDGE], [195, 68, 1, 56, ROAD_EDGE]);
  // Grusgång genom parken och till torghandeln
  const paths: R[] = [
    [EX, 94, 26, 3, '#B89A6E'],
    [210, 97, EX - 210, 3, '#B89A6E'],
    [WX - 2, SY + 3, 4, HY - SY - 6, '#B89A6E'],
    [52, 158, 72, 4, '#B89A6E'],
  ];
  // Havet längst ner med strand
  const sea: R[] = [
    [0, 194, VW, 14, '#3E6F8E'],
    [0, 192, VW, 2, '#E3CF9E'],
    [0, 194, VW, 1, '#5B8CAE'],
  ];
  const wave = seeded(5);
  for (let i = 0; i < 40; i++) sea.push([Math.floor(wave() * VW), 196 + Math.floor(wave() * 11), 3, 1, '#7FA9C6']);
  // Kullar längst upp
  const hills: R[] = [
    [0, 0, VW, 6, '#2A5E42'],
    [0, 6, VW, 2, '#26573D'],
    [20, 0, 40, 3, '#3d7d58'],
    [140, 0, 60, 2, '#3d7d58'],
    [250, 0, 50, 3, '#3d7d58'],
  ];
  const n = Math.round(level * SNOW_PATCHES.length);
  return (
    <g>
      <rect x={0} y={0} width={VW} height={VH} fill={GRASS} />
      {rects(hills, 'h')}
      {rects(tufts, 't')}
      {level < 0.5 && rects(flowers, 'f')}
      {rects(ROADS, 'r')}
      {rects(cobbles, 'cb')}
      {rects(edges, 'e')}
      {rects(paths, 'p')}
      {rects(plaza, 'pl')}
      {rects(sea, 'sea')}
      {n > 0 && rects(SNOW_PATCHES.slice(0, n), 's')}
    </g>
  );
}

function Tree({ x, y, s = 1, snow = 0 }: { x: number; y: number; s?: number; snow?: number }) {
  const w = 10 * s;
  return (
    <g>
      <rect x={x + 1} y={y + 8 * s + 3} width={w - 2} height={1.5} fill="#00000022" />
      <rect x={x + w / 2 - 1} y={y + 8 * s} width={2} height={4 * s} fill="#4A2E16" />
      <rect x={x} y={y + 3 * s} width={w} height={6 * s} fill="#1F5A44" />
      <rect x={x + 2 * s} y={y} width={w - 4 * s} height={3 * s} fill="#1F5A44" />
      <rect x={x + 2 * s} y={y + 2 * s} width={3 * s} height={2 * s} fill={snow > 0.3 ? SNOW_SHADE : '#3d7d58'} />
      <rect x={x + w - 3 * s} y={y + 5 * s} width={2 * s} height={2 * s} fill="#174A38" />
      <rect x={x} y={y + 8 * s} width={w} height={1} fill="#173f31" />
      {snow > 0.2 && (
        <>
          <rect x={x + 2 * s} y={y} width={w - 4 * s} height={1} fill={SNOW} />
          <rect x={x} y={y + 3 * s} width={snow > 0.5 ? w : w / 2} height={1} fill={SNOW} />
          {snow > 0.4 && <rect x={x + 1} y={y + 6 * s} width={2} height={1} fill={SNOW} />}
          {snow > 0.5 && <rect x={x + w - 4} y={y + 5 * s} width={2} height={1} fill={SNOW} />}
        </>
      )}
    </g>
  );
}

function Bush({ x, y, snow = 0 }: { x: number; y: number; snow?: number }) {
  return (
    <g>
      <rect x={x} y={y + 1} width={7} height={3} fill="#255a3e" />
      <rect x={x + 1} y={y} width={5} height={1} fill="#2f7a52" />
      <rect x={x + 2} y={y + 1} width={1} height={1} fill="#C2324A" />
      {snow > 0.3 && <rect x={x + 1} y={y} width={5} height={1} fill={SNOW} />}
    </g>
  );
}

function Bench({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={8} height={1} fill="#6B3E1E" />
      <rect x={x} y={y + 2} width={8} height={1} fill="#8A5A2B" />
      <rect x={x + 1} y={y + 3} width={1} height={2} fill="#4A2E16" />
      <rect x={x + 6} y={y + 3} width={1} height={2} fill="#4A2E16" />
    </g>
  );
}

/** Torghandelns stånd med randigt tak */
function Stall({ x, y, c }: { x: number; y: number; c: string }) {
  const stripes: R[] = [];
  for (let i = 0; i < 12; i += 2) stripes.push([x + i, y, 1, 3, '#F4F1E6']);
  return (
    <g>
      <rect x={x} y={y} width={12} height={3} fill={c} />
      {rects(stripes, `st${x}`)}
      <rect x={x + 1} y={y + 3} width={1} height={7} fill="#4A2E16" />
      <rect x={x + 10} y={y + 3} width={1} height={7} fill="#4A2E16" />
      <rect x={x} y={y + 7} width={12} height={3} fill="#8A5A2B" />
      <rect x={x + 2} y={y + 6} width={2} height={1} fill="#E9B44C" />
      <rect x={x + 5} y={y + 6} width={2} height={1} fill="#C97B5A" />
      <rect x={x + 8} y={y + 6} width={2} height={1} fill="#6D8FB3" />
    </g>
  );
}

function Snowman({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y + 5} width={6} height={5} fill={SNOW} />
      <rect x={x + 1} y={y + 1} width={4} height={4} fill={SNOW} />
      <rect x={x + 1} y={y} width={4} height={1} fill="#1A1A1A" />
      <rect x={x + 2} y={y - 1} width={2} height={1} fill="#1A1A1A" />
      <rect x={x + 2} y={y + 2} width={1} height={1} fill="#1A1A1A" />
      <rect x={x + 4} y={y + 3} width={2} height={1} fill="#E07B39" />
      <rect x={x} y={y + 5} width={6} height={1} fill="#C2324A" />
      <rect x={x + 2} y={y + 7} width={1} height={1} fill="#1A1A1A" />
    </g>
  );
}

/** Julgranen med stjärna och blinkande kulor. */
function ChristmasTree({ x, y, t }: { x: number; y: number; t: number }) {
  const g = '#1F5A44';
  const g2 = '#174A38';
  const layers: R[] = [
    [x + 6, y + 3, 4, 3, g],
    [x + 4, y + 6, 8, 3, g],
    [x + 5, y + 6, 2, 1, g2],
    [x + 2, y + 9, 12, 4, g],
    [x + 3, y + 9, 3, 1, g2],
    [x + 0, y + 13, 16, 5, g],
    [x + 1, y + 13, 4, 1, g2],
    [x + 7, y + 18, 2, 3, '#4A2E16'],
    [x + 4, y + 21, 8, 2, '#8A3B22'],
    [x + 4, y + 21, 8, 1, '#C2324A'],
    [x + 6, y + 3, 4, 1, SNOW],
    [x + 4, y + 6, 2, 1, SNOW],
    [x + 10, y + 6, 2, 1, SNOW],
    [x + 2, y + 9, 2, 1, SNOW],
    [x + 12, y + 9, 2, 1, SNOW],
    [x + 0, y + 13, 3, 1, SNOW],
    [x + 13, y + 13, 3, 1, SNOW],
  ];
  const balls: [number, number][] = [
    [7, 5], [5, 8], [10, 8], [3, 11], [8, 11], [12, 11], [2, 15], [6, 16], [10, 15], [14, 16],
  ];
  const colors = ['#C2324A', '#E9B44C', '#F4F1E6', '#6D8FB3'];
  const gifts: R[] = [
    [x - 4, y + 19, 4, 4, '#C2324A'],
    [x - 2.5, y + 19, 1, 4, '#E9B44C'],
    [x + 16, y + 20, 5, 3, '#E9B44C'],
    [x + 18, y + 20, 1, 3, '#C2324A'],
    [x + 12, y + 21, 3, 2, '#6D8FB3'],
  ];
  return (
    <g>
      <rect x={x + 1} y={y + 22} width={14} height={2} fill="#00000022" />
      {rects(layers, 'xt')}
      {balls.map(([bx, by], i) => (
        <rect key={i} x={x + bx} y={y + by} width={1} height={1} fill={colors[(i + t) % colors.length]} opacity={(i + t) % 3 === 0 ? 0.55 : 1} />
      ))}
      <rect x={x + 7} y={y} width={2} height={2} fill="#FFE2A8" />
      <rect x={x + 6} y={y + 1} width={4} height={1} fill="#E9B44C" opacity={t % 2 ? 1 : 0.7} />
      {rects(gifts, 'xg')}
    </g>
  );
}

/** Fallande snö. tick räknar upp tio gånger i sekunden. */
export function Snowfall({ tick, count = 110 }: { tick: number; count?: number }) {
  const r = seeded(31);
  const flakes = Array.from({ length: count }, () => ({ x: r() * VW, y: r() * VH, v: 0.22 + r() * 0.35, a: r() * 6, big: r() > 0.8 }));
  return (
    <g pointerEvents="none">
      {flakes.map((f, i) => {
        const y = (f.y + tick * f.v) % VH;
        const x = (f.x + Math.sin((tick + f.a * 10) / 14) * 1.5 + VW) % VW;
        return <rect key={i} x={x} y={y} width={f.big ? 1.4 : 1} height={f.big ? 1.4 : 1} fill="#FFFFFF" opacity={f.big ? 0.95 : 0.8} />;
      })}
    </g>
  );
}

// Fontänen mitt på torget (ritad runt 160, 96)
function Fountain({ t, frozen }: { t: number; frozen: boolean }) {
  const drop = t % 3;
  const x = MX - 8;
  const y = 92;
  return (
    <g>
      <rect x={x - 1} y={y + 1} width={18} height={10} fill="#00000022" />
      <rect x={x} y={y} width={16} height={9} fill="#8A9690" />
      <rect x={x + 1} y={y + 1} width={14} height={7} fill={frozen ? '#BFD9E8' : '#6D8FB3'} />
      <rect x={x + 2} y={y + 2} width={frozen ? 6 : 12} height={1} fill={frozen ? '#F2F6F8' : '#8FB0D6'} />
      <rect x={x + 7} y={y - 5} width={2} height={7} fill="#8A9690" />
      <rect x={x + 6} y={y - 6} width={4} height={1} fill={frozen ? SNOW : '#8A9690'} />
      {!frozen && (
        <>
          <rect x={x + 7} y={y - 8 + drop} width={2} height={1} fill="#BFE3FF" />
          <rect x={x + 5 - drop} y={y - 4} width={1} height={1} fill="#BFE3FF" />
          <rect x={x + 10 + drop} y={y - 4} width={1} height={1} fill="#BFE3FF" />
        </>
      )}
      {frozen && <rect x={x} y={y} width={16} height={1} fill={SNOW} />}
    </g>
  );
}

function Pond({ frozen }: { frozen: boolean }) {
  const x = 246;
  const y = 104;
  return (
    <g>
      <rect x={x} y={y} width={26} height={16} fill={frozen ? SNOW_SHADE : '#255a3e'} />
      <rect x={x + 1} y={y + 1} width={24} height={14} fill={frozen ? '#A9C8DA' : '#4f7f9c'} />
      <rect x={x + 3} y={y + 2} width={20} height={12} fill={frozen ? '#C6DDEA' : '#6D8FB3'} />
      <rect x={x + 6} y={y + 5} width={frozen ? 7 : 4} height={1} fill={frozen ? '#F2F6F8' : '#BFE3FF'} />
      <rect x={x + 14} y={y + 9} width={frozen ? 6 : 3} height={1} fill={frozen ? '#F2F6F8' : '#BFE3FF'} />
      {!frozen && <rect x={x + 18} y={y + 3} width={3} height={2} fill="#3d7d58" />}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x={x + i * 4} y={y + 17} width={1} height={3} fill="#EAD7BC" />
      ))}
      <rect x={x} y={y + 18} width={25} height={1} fill="#EAD7BC" />
    </g>
  );
}

function Board({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x + 1} y={y + 6} width={1} height={5} fill="#4A2E16" />
      <rect x={x + 9} y={y + 6} width={1} height={5} fill="#4A2E16" />
      <rect x={x} y={y} width={11} height={7} fill="#6B3E1E" />
      <rect x={x + 1} y={y + 1} width={9} height={5} fill="#EAD7BC" />
      <rect x={x + 2} y={y + 2} width={3} height={2} fill="#F4F1E6" />
      <rect x={x + 6} y={y + 2} width={3} height={3} fill="#E9B44C" />
    </g>
  );
}

function Lamp({ x, y, night }: { x: number; y: number; night: boolean }) {
  return (
    <g>
      {night && <rect x={x - 4} y={y - 3} width={9} height={9} fill="#E9B44C" opacity={0.16} />}
      <rect x={x} y={y} width={1} height={9} fill="#2B3A4A" />
      <rect x={x - 1} y={y + 8} width={3} height={1} fill="#2B3A4A" />
      <rect x={x - 1} y={y - 1} width={3} height={2} fill={night ? '#FFE2A8' : '#8A9690'} />
    </g>
  );
}

/** En båt vid bryggan som guppar lite. */
function Boat({ t }: { t: number }) {
  const b = t % 4 < 2 ? 0 : 0.6;
  return (
    <g transform={`translate(0 ${b})`}>
      <rect x={284} y={199} width={18} height={3} fill="#8A3B22" />
      <rect x={286} y={202} width={14} height={1} fill="#5A2616" />
      <rect x={292} y={190} width={1} height={9} fill="#4A2E16" />
      <rect x={293} y={191} width={6} height={6} fill="#F4F1E6" />
      <rect x={293} y={196} width={6} height={1} fill="#E9B44C" />
    </g>
  );
}

function Gull({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={2} height={1} fill="#F4F1E6" />
      <rect x={x + 2} y={y + 1} width={1} height={1} fill="#F4F1E6" />
      <rect x={x + 3} y={y} width={2} height={1} fill="#F4F1E6" />
    </g>
  );
}

/** Ljusslinga tvärs över Torggatan, mellan två stolpar */
function StreetGarland({ x1, x2, y, t }: { x1: number; x2: number; y: number; t: number }) {
  const colors = ['#C2324A', '#E9B44C', '#3d9d68', '#6D8FB3'];
  const out: ReactNode[] = [
    <rect key="p1" x={x1} y={y} width={1} height={10} fill="#2B3A4A" />,
    <rect key="p2" x={x2} y={y} width={1} height={10} fill="#2B3A4A" />,
  ];
  for (let i = 0, k = 0; x1 + i < x2; i += 2, k++) {
    const sag = Math.round(Math.sin((i / (x2 - x1)) * Math.PI) * 3);
    out.push(<rect key={i} x={x1 + i} y={y + sag} width={1} height={1} fill={k % 2 ? colors[(k + t) % colors.length] : '#173f31'} opacity={k % 2 && (k + t) % 3 === 0 ? 0.55 : 1} />);
  }
  return <g>{out}</g>;
}

// ---------- Husen ----------

function win(x: number, y: number, lit: boolean, w = 4, h = 4): R[] {
  return [
    [x - 1, y - 1, w + 2, h + 2, '#4A2E16'],
    [x, y, w, h, lit ? '#FFE2A8' : '#BFE3FF'],
    [x + w / 2 - 0.5, y, 1, h, '#4A2E16'],
  ];
}

function door(x: number, y: number, open: boolean): R[] {
  return [
    [x - 3, y - 7, 6, 7, open ? '#1A1A1A' : '#6B3E1E'],
    [x - 3, y - 7, 6, 1, '#4A2E16'],
    [x + 1, y - 4, 1, 1, '#E9B44C'],
  ];
}

/** Trappstegstak: smalnar av uppåt. */
function roofRows(x: number, y: number, w: number, h: number, c: string, dark: string, snow = false): R[] {
  const out: R[] = [];
  for (let i = 0; i < h; i++) {
    const inset = Math.round((i * w) / (2 * h + 2));
    out.push([x + inset, y + h - 1 - i, w - 2 * inset, 1, i === 0 ? dark : snow && i >= h - 2 ? SNOW : c]);
    // snön ligger kvar i kanterna av varje trappsteg
    if (snow && i > 0 && i < h - 2) out.push([x + inset, y + h - 1 - i, 1, 1, SNOW], [x + w - inset - 1, y + h - 1 - i, 1, 1, SNOW]);
  }
  return out;
}

/** Var ljusslingan sitter på varje hus: [x, y, bredd] längs takfoten. */
const EAVES: Record<AgentId, [number, number, number]> = {
  reminder: [18, 26, 32],
  builder: [80, 22, 34],
  advisor: [146, 24, 30],
  noter: [20, 82, 32],
  reviewer: [150, 62, 16],
  planner: [106, 87, 32],
  marketer: [60, 87, 28],
  scout: [232, 166, 36],
};

function Lights({ id, t }: { id: AgentId; t: number }) {
  const [x, y, w] = EAVES[id];
  const colors = ['#C2324A', '#E9B44C', '#3d9d68', '#6D8FB3'];
  const out: ReactNode[] = [<rect key="wire" x={x} y={y} width={w} height={0.5} fill="#173f31" />];
  for (let i = 1, k = 0; i < w - 1; i += 3, k++)
    out.push(<rect key={i} x={x + i} y={y + 0.5} width={1} height={1} fill={colors[(k + t) % colors.length]} opacity={(k + t) % 2 ? 1 : 0.6} />);
  return <g>{out}</g>;
}

function Wreath({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 1.5} y={y - 6.5} width={3} height={3} fill="#1F5A44" />
      <rect x={x - 0.5} y={y - 5.5} width={1} height={1} fill="#6B3E1E" />
      <rect x={x - 0.5} y={y - 4} width={1} height={1} fill="#C2324A" />
    </g>
  );
}

export function House({ def, night, home, t, smoke, winter = false, xmas = false }: { def: AgentDef; night: boolean; home: boolean; t: number; smoke: boolean; winter?: boolean; xmas?: boolean }) {
  // Husen är ritade där de stod i den mindre byn. Flytta dem till sin nya plats.
  const old = OLD_DOORS[def.id];
  const d = old ?? DOORS[def.id];
  const dx = old ? DOORS[def.id].x - old.x : 0;
  const dy = old ? DOORS[def.id].y - old.y : 0;
  const lit = night && home;
  const shade = '#00000033';
  const roof = (x: number, y: number, w: number, h: number, c: string, dark: string) => roofRows(x, y, w, h, c, dark, winter);
  let list: R[] = [];
  let extra: ReactNode = null;
  switch (def.id) {
    case 'reminder': {
      // Klocktornet: torn med urtavla och en låg hall
      list = [
        [17, 40, 34, 2, shade],
        [18, 26, 32, 15, def.wall],
        ...roof(16, 20, 36, 7, def.roof, '#8A4A35'),
        [27, 6, 13, 21, '#E7D3A8'],
        ...roof(25, 0, 17, 7, def.roof, '#8A4A35'),
        ...win(21, 30, lit),
        ...win(43, 30, lit),
        ...door(d.x, d.y, home),
      ];
      const hand = Math.floor(t / 6) % 4;
      extra = (
        <g>
          <rect x={29} y={9} width={9} height={9} fill="#4A2E16" />
          <rect x={30} y={10} width={7} height={7} fill="#F4F1E6" />
          <rect x={33} y={11} width={1} height={3} fill="#1A1A1A" />
          <rect x={hand % 2 ? 33 : 34} y={hand < 2 ? 13 : 14} width={hand % 2 ? 2 : 1} height={1} fill="#C97B5A" />
          <rect x={32} y={20} width={3} height={3} fill="#E9B44C" />
        </g>
      );
      break;
    }
    case 'builder': {
      // Verkstaden: bred lada med stor port, städ och lådor
      list = [
        [79, 40, 36, 2, shade],
        [80, 22, 34, 19, def.wall],
        [80, 22, 34, 1, '#C4A37E'],
        ...roof(77, 12, 40, 11, def.roof, '#5A2616'),
        [91, 31, 10, 10, home ? '#1A1A1A' : '#6B3E1E'],
        [91, 31, 10, 1, '#4A2E16'],
        [96, 31, 1, 10, '#4A2E16'],
        ...win(83, 27, lit),
        ...win(106, 27, lit),
        [117, 36, 5, 5, '#8A5A2B'],
        [117, 36, 5, 1, '#6B3E1E'],
        [122, 38, 4, 3, '#8A5A2B'],
        [70, 37, 6, 2, '#5B6670'],
        [72, 39, 2, 2, '#3E4650'],
        [88, 14, 16, 5, '#1F5A44'],
        [89, 15, 14, 3, '#E9B44C'],
      ];
      extra = (
        <g>
          <rect x={93} y={15.5} width={6} height={1} fill="#1F5A44" />
          <rect x={92} y={15} width={2} height={2} fill="#1F5A44" />
          <rect x={103} y={10} width={3} height={7} fill="#5A2616" />
          <rect x={102} y={10} width={5} height={1} fill="#3A1A10" />
          {smoke && (
            <g opacity={0.6}>
              <rect x={104} y={6 - (t % 4)} width={2} height={2} fill="#E9EEEA" />
              <rect x={106} y={2 - (t % 4)} width={2} height={2} fill="#E9EEEA" />
            </g>
          )}
        </g>
      );
      break;
    }
    case 'advisor': {
      // Observatoriet: hus med kupol och teleskop
      list = [
        [145, 40, 32, 2, shade],
        [146, 24, 30, 17, def.wall],
        [146, 24, 30, 1, '#C9C4DE'],
        [150, 18, 22, 6, def.roof],
        [152, 14, 18, 4, def.roof],
        [155, 11, 12, 3, def.roof],
        [158, 10, 6, 1, def.roof],
        ...(winter ? ([[158, 10, 6, 1, SNOW], [155, 11, 3, 1, SNOW], [164, 11, 3, 1, SNOW], [152, 14, 3, 1, SNOW], [167, 14, 3, 1, SNOW], [150, 18, 2, 1, SNOW], [170, 18, 2, 1, SNOW]] as R[]) : []),
        [160, 11, 2, 13, '#1F2E40'],
        ...win(150, 29, lit),
        ...win(168, 29, lit),
        ...door(d.x, d.y, home),
      ];
      extra = (
        <g>
          <rect x={165} y={8} width={2} height={2} fill="#8A9690" />
          <rect x={167} y={6} width={2} height={2} fill="#8A9690" />
          <rect x={169} y={4} width={3} height={2} fill="#E9B44C" />
          <rect x={153} y={16} width={1} height={1} fill="#E9B44C" />
          <rect x={168} y={19} width={1} height={1} fill="#E9B44C" />
        </g>
      );
      break;
    }
    case 'noter': {
      // Skrivarstugan: liten stuga med skorsten och skylt med fjäderpenna
      list = [
        [19, 98, 34, 2, shade],
        [20, 82, 32, 17, def.wall],
        ...roof(17, 72, 38, 11, def.roof, '#123A2C'),
        [44, 68, 4, 8, '#6B3E1E'],
        ...win(24, 87, lit),
        ...win(44, 87, lit),
        ...door(d.x, d.y, home),
        [54, 86, 1, 10, '#4A2E16'],
        [52, 86, 7, 5, '#F4F1E6'],
        [53, 87, 5, 1, '#6B3E1E'],
        [53, 89, 4, 1, '#6B3E1E'],
      ];
      extra = smoke ? (
        <g opacity={0.6}>
          <rect x={45} y={64 - (t % 4)} width={2} height={2} fill="#E9EEEA" />
          <rect x={47} y={60 - (t % 4)} width={2} height={2} fill="#E9EEEA" />
        </g>
      ) : null;
      break;
    }
    case 'reviewer': {
      // Utkikstornet: smalt torn med balkong och flagga
      list = [
        [147, 98, 24, 2, shade],
        [150, 62, 16, 37, def.wall],
        [150, 62, 16, 1, '#B8C6BD'],
        [147, 70, 22, 2, '#4A2E16'],
        [147, 68, 1, 2, '#4A2E16'],
        [168, 68, 1, 2, '#4A2E16'],
        ...roof(148, 54, 20, 8, def.roof, '#1A2530'),
        [157, 44, 1, 10, '#4A2E16'],
        ...win(156, 76, lit, 4, 5),
        ...win(156, 86, lit, 4, 3),
        ...door(d.x, d.y, home),
      ];
      const wave = t % 2;
      extra = (
        <g>
          <rect x={158} y={44} width={6} height={3} fill={xmas ? '#C2324A' : '#9EDBB8'} />
          <rect x={164} y={45 + wave} width={2} height={2} fill={xmas ? '#C2324A' : '#9EDBB8'} />
        </g>
      );
      break;
    }
    case 'planner': {
      // Kartkammaren: låg stuga med stor karta i fönstret och vindflöjel på taket
      list = [
        [105, 98, 34, 2, shade],
        [106, 87, 32, 12, def.wall],
        [106, 87, 32, 1, '#B9C8D4'],
        ...roof(103, 79, 38, 9, def.roof, '#1B3D5C'),
        [110, 89, 8, 6, '#4A2E16'],
        [111, 90, 6, 4, lit ? '#FFE2A8' : '#EAD7BC'],
        [112, 91, 2, 1, '#C2324A'],
        [115, 92, 1, 1, '#2C5D8A'],
        [113, 93, 3, 0.5, '#2C5D8A'],
        ...win(130, 90, lit),
        ...door(d.x, d.y, home),
        [121, 72, 1, 8, '#4A2E16'],
      ];
      const dir = Math.floor(t / 5) % 2;
      extra = (
        <g>
          <rect x={dir ? 118 : 120} y={72} width={5} height={1} fill="#E9B44C" />
          <rect x={dir ? 117 : 124} y={71} width={1} height={3} fill="#E9B44C" />
        </g>
      );
      break;
    }
    case 'marketer': {
      // Studion: liten studio med ringlampa i fönstret och en antenn
      list = [
        [59, 98, 32, 2, shade],
        [60, 87, 28, 12, def.wall],
        [60, 87, 28, 1, '#D9BFC3'],
        ...roof(58, 80, 32, 8, def.roof, '#7A1C2C'),
        ...win(64, 90, lit),
        ...door(d.x, d.y, home),
        [84, 74, 1, 7, '#2B3A4A'],
        [82, 74, 5, 1, '#2B3A4A'],
      ];
      const on = home || night ? 1 : t % 4 === 0 ? 0.6 : 1;
      extra = (
        <g>
          {/* ringlampa */}
          <rect x={79} y={89} width={6} height={6} fill="#2B3A4A" />
          <rect x={80} y={90} width={4} height={4} fill="#FFF5D6" opacity={on} />
          <rect x={81} y={91} width={2} height={2} fill="#2B3A4A" />
          {/* not i neon */}
          <rect x={69} y={81} width={1} height={4} fill="#25F4EE" />
          <rect x={69} y={81} width={3} height={1} fill="#25F4EE" />
          <rect x={68} y={84} width={2} height={2} fill="#FE2C55" opacity={t % 2 ? 1 : 0.7} />
        </g>
      );
      break;
    }
    case 'scout': {
      // Hamnen: sjöbod med kran, lådor från Japan och en skylt
      const planks: R[] = [];
      for (let y = 168; y < 186; y += 3) planks.push([232, y, 36, 1, '#CFC6B2']);
      list = [
        [231, 185, 40, 2, shade],
        [232, 166, 36, 20, def.wall],
        ...planks,
        ...roof(229, 154, 42, 13, def.roof, '#163A50'),
        ...win(237, 171, lit),
        ...win(259, 171, lit),
        ...door(d.x, d.y, home),
        [242, 160, 16, 4, '#4A2E16'],
        [243, 161, 14, 2, '#E9B44C'],
        // lådor
        [221, 178, 8, 8, '#8A5A2B'],
        [221, 178, 8, 1, '#6B3E1E'],
        [224, 181, 2, 2, '#C2324A'],
        [223, 172, 6, 6, '#A0703A'],
        [223, 172, 6, 1, '#6B3E1E'],
        // kranen
        [272, 148, 2, 38, '#4A2E16'],
        [264, 148, 20, 2, '#4A2E16'],
        [266, 150, 1, 3, '#4A2E16'],
      ];
      const sway = t % 4 < 2 ? 0 : 1;
      extra = (
        <g>
          <rect x={281 + sway} y={150} width={1} height={10} fill="#8A9690" />
          <rect x={279 + sway} y={160} width={5} height={4} fill="#8A5A2B" />
          <rect x={279 + sway} y={160} width={5} height={1} fill="#6B3E1E" />
          {/* lykta vid dörren */}
          <rect x={256} y={176} width={2} height={3} fill={night ? '#FFE2A8' : '#8A9690'} />
        </g>
      );
      break;
    }
  }
  return (
    <g transform={dx || dy ? `translate(${dx} ${dy})` : undefined}>
      {rects(list, def.id)}
      {extra}
      {xmas && <Lights id={def.id} t={t} />}
      {xmas && <Wreath x={d.x} y={d.y} />}
    </g>
  );
}

/** Byggnader utan agent: bageriet och kyrkan vid Hamnvägen, så att byn känns bebodd. */
function Bakery({ night, t }: { night: boolean; t: number }) {
  const x = 56;
  const y = 186;
  return (
    <g>
      <rect x={x - 1} y={y - 1} width={30} height={2} fill="#00000033" />
      <rect x={x} y={y - 16} width={28} height={16} fill="#EAD7BC" />
      {rects(roofRows(x - 3, y - 25, 34, 10, '#8A3B22', '#5A2616'), 'bk')}
      <rect x={x + 3} y={y - 12} width={7} height={6} fill="#4A2E16" />
      <rect x={x + 4} y={y - 11} width={5} height={4} fill={night ? '#FFE2A8' : '#F4D9A0'} />
      <rect x={x + 5} y={y - 9} width={3} height={1} fill="#C97B5A" />
      <rect x={x + 15} y={y - 7} width={6} height={7} fill="#6B3E1E" />
      <rect x={x + 9} y={y - 20} width={10} height={3} fill="#4A2E16" />
      <rect x={x + 10} y={y - 19} width={8} height={1} fill="#E9B44C" />
      <rect x={x + 22} y={y - 30} width={3} height={6} fill="#5A2616" />
      <rect x={x + 22} y={y - 34 - (t % 3)} width={2} height={2} fill="#E9EEEA" opacity={0.6} />
    </g>
  );
}

function Church({ night }: { night: boolean }) {
  const x = 116;
  const y = 186;
  return (
    <g>
      <rect x={x - 1} y={y - 1} width={26} height={2} fill="#00000033" />
      <rect x={x} y={y - 18} width={24} height={18} fill="#F4F1E6" />
      {rects(roofRows(x - 2, y - 26, 28, 9, '#2B3A4A', '#1A2530'), 'ch')}
      <rect x={x + 9} y={y - 40} width={6} height={22} fill="#F4F1E6" />
      <rect x={x + 8} y={y - 44} width={8} height={4} fill="#2B3A4A" />
      <rect x={x + 10} y={y - 48} width={4} height={4} fill="#2B3A4A" />
      <rect x={x + 11} y={y - 52} width={2} height={4} fill="#E9B44C" />
      <rect x={x + 10} y={y - 51} width={4} height={1} fill="#E9B44C" />
      <rect x={x + 10} y={y - 36} width={4} height={5} fill={night ? '#FFE2A8' : '#8FB0D6'} />
      <rect x={x + 3} y={y - 13} width={3} height={6} fill={night ? '#FFE2A8' : '#8FB0D6'} />
      <rect x={x + 18} y={y - 13} width={3} height={6} fill={night ? '#FFE2A8' : '#8FB0D6'} />
      <rect x={x + 10} y={y - 8} width={4} height={8} fill="#6B3E1E" />
    </g>
  );
}

/** Staket framför ett hus */
function Fence({ x, y, w }: { x: number; y: number; w: number }) {
  const out: R[] = [[x, y + 1, w, 1, '#EAD7BC']];
  for (let i = 0; i < w; i += 3) out.push([x + i, y, 1, 3, '#F4F1E6']);
  return <g>{rects(out, `fe${x}-${y}`)}</g>;
}

/** Brunn i parken */
function Well({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y + 4} width={8} height={5} fill="#8A9690" />
      <rect x={x + 1} y={y + 5} width={6} height={1} fill="#5B6670" />
      <rect x={x} y={y} width={1} height={5} fill="#4A2E16" />
      <rect x={x + 7} y={y} width={1} height={5} fill="#4A2E16" />
      <rect x={x - 1} y={y - 1} width={10} height={2} fill="#8A3B22" />
      <rect x={x + 3} y={y + 1} width={2} height={2} fill="#6B3E1E" />
    </g>
  );
}

const TREES: [number, number][] = [
  // skogsdungar längs kanten och mellan husen
  [2, 8], [10, 2], [56, 8], [64, 2], [74, 26], [80, 34], [136, 4], [146, 10], [150, 28], [232, 4], [242, 10], [250, 28], [298, 4], [306, 12],
  [306, 40], [2, 40], [4, 52], [2, 90], [8, 100], [64, 78], [70, 98], [100, 80], [200, 72], [205, 112], [225, 72], [300, 78], [306, 92],
  // söder om Strandgatan
  [300, 146], [292, 156], [8, 140], [4, 158], [176, 140], [186, 148], [196, 140], [200, 162], [214, 148], [300, 166], [150, 140], [142, 162],
];

/** Allt som inte är hus: träd, torg, park, torghandel, hamn, lyktor. snow 0–1 = hur mycket snö som lagt sig. */
export function Scenery({ t, night, snow = 0, xmas = false }: { t: number; night: boolean; snow?: number; xmas?: boolean }) {
  const frozen = snow > 0.45;
  const gx = (t * 0.7) % (VW + 40);
  return (
    <g>
      <Ground level={snow} />
      <Fountain t={t} frozen={frozen} />
      <Pond frozen={frozen} />
      <Board x={128} y={98} />
      {/* bänkar */}
      <Bench x={130} y={74} />
      <Bench x={182} y={116} />
      <Bench x={130} y={116} />
      <Bench x={212} y={90} />
      {/* torghandeln */}
      <Stall x={60} y={146} c="#C2324A" />
      <Stall x={78} y={146} c="#1F5A44" />
      <Stall x={96} y={146} c="#2C5D8A" />
      {/* buskar */}
      {(
        [
          [16, 48], [62, 120], [118, 50], [190, 50], [262, 50], [270, 120], [216, 124], [190, 182], [92, 180], [146, 180], [36, 180], [226, 120], [244, 76],
        ] as [number, number][]
      ).map(([x, y], i) => (
        <Bush key={i} x={x} y={y} snow={snow} />
      ))}
      {TREES.filter(([x, y]) => !(xmas && x === 200 && y === 72)).map(([x, y], i) => (
        <Tree key={i} x={x} y={y} s={i % 3 === 0 ? 1.2 : 1} snow={snow} />
      ))}
      {/* lyktor */}
      {(
        [
          [70, 50], [168, 50], [242, 50], [66, 120], [200, 120], [262, 120], [176, 178], [226, 178],
        ] as [number, number][]
      ).map(([x, y], i) => (
        <Lamp key={i} x={x} y={y} night={night} />
      ))}
      {/* bryggan och båten */}
      <rect x={270} y={186} width={34} height={4} fill="#8A5A2B" />
      {[272, 284, 296].map((x) => (
        <rect key={x} x={x} y={190} width={2} height={6} fill="#4A2E16" />
      ))}
      <Boat t={t} />
      <Gull x={(40 + gx) % VW} y={197} />
      <Gull x={(200 + gx * 0.8) % VW} y={200} />
      <Bakery night={night} t={t} />
      <Church night={night} />
      <Well x={262} y={84} />
      {/* staket framför husen */}
      <Fence x={18} y={53} w={12} />
      <Fence x={42} y={53} w={12} />
      <Fence x={268} y={53} w={10} />
      <Fence x={22} y={123} w={12} />
      <Fence x={46} y={123} w={12} />
      <Fence x={92} y={123} w={12} />
      <Fence x={116} y={123} w={10} />
      {snow > 0.2 && <Snowman x={28} y={140} />}
      {snow > 0.45 && <Snowman x={222} y={88} />}
      {xmas && <ChristmasTree x={176} y={72} t={t} />}
      {xmas && <StreetGarland x1={153} x2={167} y={64} t={t} />}
    </g>
  );
}

// ---------- Insidan av ett hus ----------

/** Rummet i varje hus, med agenten. */
export function Interior({ def, frame, xmas = false }: { def: AgentDef; frame: number; xmas?: boolean }) {
  const W = 96;
  const H = 48;
  const wall = def.wall;
  const floor: R[] = [];
  for (let x = 0; x < W; x += 8) floor.push([x, 34, 7, 14, '#8A5A2B'], [x + 7, 34, 1, 14, '#6B3E1E']);
  for (let y = 38; y < H; y += 5) floor.push([0, y, W, 1, '#7A4E25']);
  const base: R[] = [
    [0, 0, W, 34, wall],
    [0, 30, W, 4, '#C4A37E'],
    [0, 33, W, 1, '#6B3E1E'],
    // fönster
    [6, 6, 16, 14, '#4A2E16'],
    [7, 7, 14, 12, '#BFE3FF'],
    [14, 7, 1, 12, '#4A2E16'],
    [7, 13, 14, 1, '#4A2E16'],
    [8, 15, 5, 3, '#3d7d58'],
  ];
  let furn: R[] = [];
  switch (def.id) {
    case 'reminder':
      furn = [
        // stor väggklocka och kalender
        [64, 4, 16, 16, '#4A2E16'],
        [65, 5, 14, 14, '#F4F1E6'],
        [71, 7, 2, 6, '#1A1A1A'],
        [72, 12, 5, 1, '#C97B5A'],
        [40, 6, 16, 18, '#F4F1E6'],
        [40, 6, 16, 4, '#C97B5A'],
        ...[0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c): R => [42 + c * 4, 12 + r * 3, 2, 2, r === 1 && c === 2 ? '#E9B44C' : '#C4B8A0'])),
        // klocka på hylla
        [80, 26, 12, 8, '#6B3E1E'],
        [83, 22, 6, 5, '#E9B44C'],
      ];
      break;
    case 'advisor':
      furn = [
        // diagram på tavla, teleskop, glob
        [36, 5, 28, 18, '#2B3A4A'],
        [38, 17, 3, 4, '#9EDBB8'],
        [43, 14, 3, 7, '#9EDBB8'],
        [48, 11, 3, 10, '#E9B44C'],
        [53, 8, 3, 13, '#9EDBB8'],
        [58, 12, 3, 9, '#C97B5A'],
        [74, 12, 3, 3, '#8A9690'],
        [77, 10, 4, 3, '#8A9690'],
        [81, 8, 5, 3, '#E9B44C'],
        [76, 15, 1, 19, '#4A2E16'],
        [73, 33, 7, 1, '#4A2E16'],
        [86, 24, 8, 8, '#6D8FB3'],
        [88, 26, 3, 2, '#3d7d58'],
        [89, 32, 2, 2, '#4A2E16'],
      ];
      break;
    case 'noter':
      furn = [
        // bokhylla och skrivbord med bok och penna
        [60, 2, 32, 30, '#6B3E1E'],
        ...[0, 1, 2].flatMap((r) => [0, 1, 2, 3, 4, 5, 6].map((c): R => [62 + c * 4, 4 + r * 10, 3, 8, ['#C97B5A', '#1F5A44', '#E9B44C', '#6D8FB3', '#F4F1E6', '#8FB9A8', '#3B3670'][(r * 3 + c) % 7]])),
        [30, 24, 26, 3, '#8A5A2B'],
        [32, 27, 2, 7, '#6B3E1E'],
        [52, 27, 2, 7, '#6B3E1E'],
        [36, 21, 12, 3, '#F4F1E6'],
        [42, 21, 1, 3, '#C4B8A0'],
        [49, 16, 1, 6, '#F4F1E6'],
        [48, 15, 2, 2, '#F4F1E6'],
      ];
      break;
    case 'reviewer':
      furn = [
        // checklista och förstoringsglas på väggen
        [36, 4, 22, 24, '#F4F1E6'],
        [36, 4, 22, 3, '#2B3A4A'],
        ...[0, 1, 2, 3, 4].flatMap((r): R[] => [
          [38, 9 + r * 4, 2, 2, r < 3 ? '#2c7a52' : '#C97B5A'],
          [42, 10 + r * 4, 12 - (r % 2) * 4, 1, '#8A9690'],
        ]),
        [66, 6, 12, 12, '#2B3A4A'],
        [68, 8, 8, 8, '#BFE3FF'],
        [76, 16, 6, 3, '#6B3E1E'],
        [70, 26, 22, 3, '#5B6670'],
        [72, 29, 2, 5, '#3E4650'],
        [88, 29, 2, 5, '#3E4650'],
        [74, 22, 8, 4, '#1A1A1A'],
        [75, 23, 6, 2, '#9EDBB8'],
      ];
      break;
    case 'planner':
      furn = [
        // stor karta med nålar, väggkalender med kryss och skrivbord med räknedosa
        [34, 4, 30, 20, '#6B3E1E'],
        [35, 5, 28, 18, '#EAD7BC'],
        [37, 8, 8, 5, '#8FB9A8'],
        [47, 7, 10, 7, '#C9D7C2'],
        [40, 15, 12, 5, '#8FB9A8'],
        [55, 15, 6, 6, '#C9D7C2'],
        [39, 10, 1, 1, '#C2324A'],
        [50, 9, 1, 1, '#C2324A'],
        [57, 17, 1, 1, '#C2324A'],
        [44, 17, 1, 1, '#2C5D8A'],
        [40, 10.5, 10, 0.5, '#C2324A'],
        [50, 9.5, 7, 0.5, '#C2324A'],
        [70, 4, 16, 16, '#F4F1E6'],
        [70, 4, 16, 4, '#2C5D8A'],
        ...[0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c): R => [72 + c * 3.5, 10 + r * 3, 2, 2, r === 2 && c === 1 ? '#C2324A' : '#C4B8A0'])),
        [66, 24, 28, 3, '#8A5A2B'],
        [68, 27, 2, 7, '#6B3E1E'],
        [90, 27, 2, 7, '#6B3E1E'],
        [70, 20, 6, 4, '#2B3A4A'],
        [71, 21, 4, 1, '#9EDBB8'],
        [80, 21, 10, 3, '#F4F1E6'],
        [81, 22, 7, 0.5, '#2C5D8A'],
      ];
      break;
    case 'marketer':
      furn = [
        // ringlampa på stativ med telefon, klädstång och en skärm med staplar
        [40, 4, 14, 14, '#2B3A4A'],
        [42, 6, 10, 10, '#FFF5D6'],
        [44, 8, 6, 6, '#2B3A4A'],
        [45.5, 9, 3, 4.5, '#1A1A1A'],
        [46, 9.5, 2, 3.5, '#25F4EE'],
        [46.5, 18, 1, 16, '#2B3A4A'],
        [43, 33, 7, 1, '#2B3A4A'],
        [62, 6, 30, 1, '#8A9690'],
        [62, 6, 1, 28, '#8A9690'],
        [91, 6, 1, 28, '#8A9690'],
        [65, 7, 5, 12, '#2C5D8A'],
        [71, 7, 5, 10, '#1F2E40'],
        [77, 7, 5, 11, '#C97B5A'],
        [83, 7, 6, 9, '#3B5A7A'],
        [66, 22, 18, 10, '#1A1A1A'],
        [67, 23, 16, 8, '#2B3A4A'],
        [69, 27, 2, 3, '#FE2C55'],
        [73, 25, 2, 5, '#25F4EE'],
        [77, 26, 2, 4, '#FE2C55'],
        [81, 24, 1.5, 6, '#25F4EE'],
      ];
      break;
    case 'scout':
      furn = [
        // anslagstavla med referensbilder, karta över Japan, kikare och lådor
        [36, 4, 26, 20, '#8A5A2B'],
        [37, 5, 24, 18, '#C9A46A'],
        [39, 7, 6, 6, '#F4F1E6'],
        [40, 8, 4, 4, '#2C5D8A'],
        [47, 7, 6, 6, '#F4F1E6'],
        [48, 8, 4, 4, '#3B5A7A'],
        [55, 8, 5, 6, '#F4F1E6'],
        [56, 9, 3, 4, '#1F2E40'],
        [40, 15, 6, 6, '#F4F1E6'],
        [41, 16, 4, 4, '#4f7f9c'],
        [49, 15, 9, 6, '#F4F1E6'],
        [50, 16, 2, 2, '#C2324A'],
        [53, 17, 4, 1, '#2B3A4A'],
        [66, 5, 22, 16, '#F4F1E6'],
        [67, 6, 20, 14, '#BFE3FF'],
        [77, 8, 3, 2, '#3d7d58'],
        [76, 10, 4, 3, '#3d7d58'],
        [74, 13, 4, 3, '#3d7d58'],
        [72, 15, 3, 2, '#3d7d58'],
        [76, 11, 1, 1, '#C2324A'],
        [66, 24, 26, 3, '#8A5A2B'],
        [68, 27, 2, 7, '#6B3E1E'],
        [88, 27, 2, 7, '#6B3E1E'],
        [72, 21, 5, 3, '#2B3A4A'],
        [78, 21, 5, 3, '#2B3A4A'],
        [77, 22, 1, 1, '#1A1A1A'],
        [84, 28, 8, 6, '#A0703A'],
        [84, 28, 8, 1, '#6B3E1E'],
      ];
      break;
    case 'builder':
      furn = [
        // verktygsvägg och arbetsbänk
        [36, 4, 30, 16, '#C4A37E'],
        [39, 6, 2, 10, '#6B3E1E'],
        [38, 5, 4, 3, '#8A9690'],
        [45, 6, 1, 10, '#8A9690'],
        [44, 15, 3, 2, '#C97B5A'],
        [50, 7, 6, 2, '#8A9690'],
        [53, 9, 1, 7, '#6B3E1E'],
        [59, 6, 4, 9, '#E9B44C'],
        [66, 24, 28, 3, '#8A5A2B'],
        [68, 27, 2, 7, '#6B3E1E'],
        [90, 27, 2, 7, '#6B3E1E'],
        [70, 20, 8, 4, '#5B6670'],
        [82, 19, 8, 5, '#1F5A44'],
        [84, 20, 4, 2, '#9EDBB8'],
      ];
      break;
  }
  // Sådant som finns i alla hus: taklampa, matta, växt, tavla med namnet
  const common: R[] = [
    [27, 0, 1, 5, '#2B3A4A'],
    [24, 5, 7, 2, '#E9B44C'],
    [25, 7, 5, 1, '#FFE2A8'],
    [12, 40, 28, 6, def.roof],
    [13, 41, 26, 4, '#F4F1E6'],
    [14, 42, 24, 2, def.roof],
    [2, 26, 6, 8, '#C97B5A'],
    [3, 34, 4, 0.01, '#000'],
    [1, 20, 3, 6, '#3d7d58'],
    [5, 18, 3, 8, '#1F5A44'],
    [3, 16, 3, 5, '#3d7d58'],
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pixel block h-auto w-full" role="img" aria-label={`Inne i ${def.house}`}>
      {rects(base, 'b')}
      {rects(floor, 'f')}
      {rects(common, 'c')}
      {rects(furn, 'u')}
      {xmas && (
        <g>
          {/* girlang under taket och en liten gran i hörnet */}
          {Array.from({ length: 24 }, (_, i) => (
            <rect key={i} x={i * 4} y={i % 2 ? 1.5 : 1} width={4} height={1} fill="#1F5A44" />
          ))}
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={`l${i}`} x={i * 8 + 2} y={2.5} width={1} height={1} fill={['#C2324A', '#E9B44C', '#F4F1E6'][(i + frame) % 3]} />
          ))}
          <rect x={86} y={38} width={8} height={8} fill="#1F5A44" />
          <rect x={88} y={34} width={4} height={4} fill="#1F5A44" />
          <rect x={89} y={32} width={2} height={2} fill="#E9B44C" />
          <rect x={87} y={40} width={1} height={1} fill="#C2324A" />
          <rect x={91} y={42} width={1} height={1} fill="#E9B44C" />
          <rect x={89} y={37} width={1} height={1} fill="#C2324A" />
          <rect x={89} y={46} width={2} height={2} fill="#4A2E16" />
        </g>
      )}
      <g transform="translate(20 21)">
        <AgentSprite def={def} frame={frame} xmas={xmas} />
      </g>
    </svg>
  );
}
