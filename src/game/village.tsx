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
};

const FACE = ['...SSSSSS...', '...SESSES...', '...SSSSSS...', '....SMMS....'];
const FACE_GLASSES = ['...SSSSSS...', '...GEGGEG...', '...SSSSSS...', '....SMMS....'];
const BODY = ['..TTTTTTTT..', '.STTTTTTTTS.', '.S.TTWWTT.S.', '...TTTTTT...'];
const LEGS = [
  ['...LL..LL...', '..FFF..FFF..'],
  ['....LLLL....', '...FF..FF...'],
  ['..LL....LL..', '.FFF....FFF.'],
];

/** En agent som pixelfigur. frame växlar benen när den går. */
export function AgentSprite({ def, frame = 0, flip = false, size, className }: { def: AgentDef; frame?: number; flip?: boolean; size?: number; className?: string }) {
  const c = def.colors;
  const pal: Record<string, string> = {
    Y: c.hat, C: c.hat, P: c.hat, B: c.hat, K: c.hat, Z: c.trim,
    S: '#F2C9A0', E: '#1A1A1A', M: '#C46A5A', G: c.trim,
    T: c.shirt, W: c.trim, L: c.pants, F: '#2A1A0E',
  };
  const rows = [...HATS[def.id], ...(def.id === 'reviewer' ? FACE_GLASSES : FACE), ...BODY, ...LEGS[frame % 3]];
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

export const VW = 192;
export const VH = 124;

export interface Pt {
  x: number;
  y: number;
}

/** Husens dörrar (där figurerna går in och ut). */
export const DOORS: Record<AgentId, Pt> = {
  reminder: { x: 33, y: 41 },
  builder: { x: 96, y: 41 },
  advisor: { x: 160, y: 41 },
  noter: { x: 36, y: 99 },
  reviewer: { x: 158, y: 99 },
};

/** Gatunätet som figurerna går på. */
const NODES: Record<string, Pt> = {
  ...Object.fromEntries(Object.entries(DOORS).map(([k, v]) => [`d-${k}`, v])),
  'c-reminder': { x: 33, y: 47 },
  'c-advisor': { x: 160, y: 47 },
  ht: { x: 96, y: 47 },
  p: { x: 96, y: 63 },
  p1: { x: 86, y: 58 },
  p2: { x: 107, y: 60 },
  p3: { x: 88, y: 70 },
  p4: { x: 105, y: 70 },
  dam: { x: 117, y: 66 },
  hb: { x: 96, y: 104 },
  'c-noter': { x: 36, y: 104 },
  'c-reviewer': { x: 158, y: 104 },
  bank: { x: 62, y: 104 },
};

const EDGES: [string, string][] = [
  ['d-reminder', 'c-reminder'],
  ['c-reminder', 'ht'],
  ['d-builder', 'ht'],
  ['d-advisor', 'c-advisor'],
  ['c-advisor', 'ht'],
  ['ht', 'p'],
  ['p', 'p1'],
  ['p', 'p2'],
  ['p', 'p3'],
  ['p', 'p4'],
  ['p', 'dam'],
  ['p', 'hb'],
  ['hb', 'bank'],
  ['bank', 'c-noter'],
  ['c-noter', 'd-noter'],
  ['hb', 'c-reviewer'],
  ['c-reviewer', 'd-reviewer'],
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

export const SPOTS = ['p1', 'p2', 'p3', 'p4', 'dam', 'bank'];
export const nodeAt = (k: string): Pt => NODES[k];

type R = [number, number, number, number, string];

function rects(list: R[], key: string) {
  return list.map(([x, y, w, h, f], i) => <rect key={`${key}${i}`} x={x} y={y} width={w} height={h} fill={f} />);
}

/** Pseudoslump som blir likadan varje gång (gräs, blommor). */
function seeded(n: number) {
  let s = n;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function Ground() {
  const r = seeded(7);
  const tufts: R[] = [];
  for (let i = 0; i < 170; i++) tufts.push([Math.floor(r() * VW), Math.floor(r() * VH), 1, 1, r() > 0.5 ? '#3d7d58' : '#255a3e']);
  const flowers: R[] = [];
  const fc = ['#E9B44C', '#F4F1E6', '#C97B5A', '#8FB0D6'];
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * VW);
    const y = Math.floor(r() * VH);
    if ((y > 43 && y < 51) || (y > 100 && y < 108) || (x > 74 && x < 118 && y > 50 && y < 78)) continue;
    flowers.push([x, y, 1, 1, fc[i % 4]]);
  }
  const road = '#C9A46A';
  const edge = '#A8834C';
  const paths: R[] = [
    // huvudgatan och gränden längst ner
    [24, 44, 142, 6, road],
    [30, 101, 134, 6, road],
    // stumpar till dörrarna
    [30, 41, 6, 6, road],
    [157, 41, 6, 6, road],
    [93, 41, 6, 6, road],
    [33, 99, 6, 5, road],
    [155, 99, 6, 5, road],
    // från torget till gränden
    [93, 74, 6, 28, road],
    // till dammen
    [112, 63, 8, 6, road],
  ];
  const edges: R[] = [
    [24, 50, 142, 1, edge],
    [30, 107, 134, 1, edge],
    [93, 74, 1, 27, edge],
    [98, 74, 1, 27, edge],
  ];
  // torget
  const plaza: R[] = [[76, 52, 40, 23, '#BFA27A']];
  for (let y = 53; y < 75; y += 3) for (let x = 77 + ((y / 3) % 2 ? 1 : 0); x < 115; x += 4) plaza.push([x, y, 2, 1, '#A8885E']);
  plaza.push([76, 75, 40, 1, edge]);
  return (
    <g>
      <rect x={0} y={0} width={VW} height={VH} fill="#2f6b4a" />
      {rects(tufts, 't')}
      {rects(paths, 'r')}
      {rects(edges, 'e')}
      {rects(plaza, 'pl')}
      {rects(flowers, 'f')}
    </g>
  );
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const w = 10 * s;
  return (
    <g>
      <rect x={x + w / 2 - 1} y={y + 8 * s} width={2} height={4 * s} fill="#4A2E16" />
      <rect x={x} y={y + 3 * s} width={w} height={6 * s} fill="#1F5A44" />
      <rect x={x + 2 * s} y={y} width={w - 4 * s} height={3 * s} fill="#1F5A44" />
      <rect x={x + 2 * s} y={y + 2 * s} width={3 * s} height={2 * s} fill="#3d7d58" />
      <rect x={x} y={y + 8 * s} width={w} height={1} fill="#173f31" />
    </g>
  );
}

function Fountain({ t }: { t: number }) {
  const drop = t % 3;
  return (
    <g>
      <rect x={89} y={60} width={14} height={8} fill="#8A9690" />
      <rect x={90} y={61} width={12} height={6} fill="#6D8FB3" />
      <rect x={91} y={62} width={10} height={1} fill="#8FB0D6" />
      <rect x={95} y={56} width={2} height={6} fill="#8A9690" />
      <rect x={94} y={55} width={4} height={1} fill="#8A9690" />
      <rect x={95} y={53 + drop} width={2} height={1} fill="#BFE3FF" />
      <rect x={93 - drop} y={57} width={1} height={1} fill="#BFE3FF" />
      <rect x={98 + drop} y={57} width={1} height={1} fill="#BFE3FF" />
    </g>
  );
}

function Pond() {
  return (
    <g>
      <rect x={120} y={57} width={22} height={14} fill="#255a3e" />
      <rect x={121} y={58} width={20} height={12} fill="#4f7f9c" />
      <rect x={123} y={59} width={16} height={10} fill="#6D8FB3" />
      <rect x={126} y={61} width={4} height={1} fill="#BFE3FF" />
      <rect x={133} y={65} width={3} height={1} fill="#BFE3FF" />
      <rect x={135} y={60} width={3} height={2} fill="#3d7d58" />
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
      {night && <rect x={x - 3} y={y - 2} width={7} height={7} fill="#E9B44C" opacity={0.18} />}
      <rect x={x} y={y} width={1} height={9} fill="#2B3A4A" />
      <rect x={x - 1} y={y - 1} width={3} height={2} fill={night ? '#FFE2A8' : '#8A9690'} />
    </g>
  );
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
function roof(x: number, y: number, w: number, h: number, c: string, dark: string): R[] {
  const out: R[] = [];
  for (let i = 0; i < h; i++) {
    const inset = Math.round((i * w) / (2 * h + 2));
    out.push([x + inset, y + h - 1 - i, w - 2 * inset, 1, i === 0 ? dark : c]);
  }
  return out;
}

export function House({ def, night, home, t, smoke }: { def: AgentDef; night: boolean; home: boolean; t: number; smoke: boolean }) {
  const d = DOORS[def.id];
  const lit = night && home;
  const shade = '#00000033';
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
          <rect x={158} y={44} width={6} height={3} fill="#9EDBB8" />
          <rect x={164} y={45 + wave} width={2} height={2} fill="#9EDBB8" />
        </g>
      );
      break;
    }
  }
  return (
    <g>
      {rects(list, def.id)}
      {extra}
    </g>
  );
}

/** Det som inte är hus: träd, fontän, damm, lyktor, anslagstavla. */
export function Scenery({ t, night }: { t: number; night: boolean }) {
  return (
    <g>
      <Ground />
      <Fountain t={t} />
      <Pond />
      <Board x={64} y={58} />
      <Lamp x={74} y={40} night={night} />
      <Lamp x={120} y={40} night={night} />
      <Lamp x={90} y={96} night={night} />
      <Lamp x={102} y={96} night={night} />
      {[
        [2, 4],
        [4, 50],
        [6, 66],
        [2, 106],
        [56, 4],
        [60, 18],
        [126, 4],
        [132, 20],
        [178, 2],
        [180, 50],
        [176, 104],
        [120, 80],
        [134, 84],
        [64, 80],
        [76, 108],
        [110, 108],
      ].map(([x, y], i) => (
        <Tree key={i} x={x} y={y} s={i % 3 === 0 ? 1.2 : 1} />
      ))}
      {/* staket vid dammen */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={120 + i * 4} y={73} width={1} height={3} fill="#EAD7BC" />
      ))}
      <rect x={120} y={74} width={21} height={1} fill="#EAD7BC" />
    </g>
  );
}

// ---------- Insidan av ett hus ----------

/** Rummet i varje hus, med agenten. */
export function Interior({ def, frame }: { def: AgentDef; frame: number }) {
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
      <g transform="translate(20 21)">
        <AgentSprite def={def} frame={frame} />
      </g>
    </svg>
  );
}
