// Tyst julmusik i Agentbyn: "Jingle Bells" (James Lord Pierpont, 1857, fri att använda) som en liten speldosa.
// Spelas med Web Audio, inga ljudfiler. Startar först när du rört vid sidan (webbläsarna kräver det)
// och går att stänga av. Volymen är låg med flit.

const FREQ: Record<string, number> = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, C5: 523.25, G3: 196.0, C3: 130.81, F3: 174.61 };

const HOOK: [string, number][] = [
  ['E4', 1], ['E4', 1], ['E4', 2], ['E4', 1], ['E4', 1], ['E4', 2], ['E4', 1], ['G4', 1], ['C4', 1.5], ['D4', 0.5], ['E4', 4],
];
/** Refrängen, i takter om fyra slag. */
export const MELODY: [string, number][] = [
  ...HOOK,
  ['F4', 1], ['F4', 1], ['F4', 1.5], ['F4', 0.5], ['F4', 1], ['E4', 1], ['E4', 1], ['E4', 0.5], ['E4', 0.5],
  ['E4', 1], ['D4', 1], ['D4', 1], ['E4', 1], ['D4', 2], ['G4', 2],
  ...HOOK,
  ['F4', 1], ['F4', 1], ['F4', 1.5], ['F4', 0.5], ['F4', 1], ['E4', 1], ['E4', 1], ['E4', 0.5], ['E4', 0.5],
  ['G4', 1], ['G4', 1], ['F4', 1], ['D4', 1], ['C4', 4],
];
const BASS = ['C3', 'G3', 'C3', 'G3', 'F3', 'C3', 'G3', 'G3', 'C3', 'G3', 'C3', 'G3', 'F3', 'C3', 'G3', 'C3'];

export const MELODY_BEATS = MELODY.reduce((s, [, b]) => s + b, 0);

let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let master: GainNode | null = null;

function bell(ac: AudioContext, out: AudioNode, f: number, at: number, len: number, vol: number, type: OscillatorType) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(0.2, len * 1.6));
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + Math.max(0.25, len * 1.7));
}

/** Startar musiken i en slinga. Säker att anropa flera gånger. */
export function startXmasMusic(volume = 0.05) {
  if (timer) return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx ??= new AC();
  void ctx.resume();
  master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  const beat = 60 / 132;
  const play = () => {
    if (!ctx || !master) return;
    let t = ctx.currentTime + 0.1;
    for (const [n, b] of MELODY) {
      bell(ctx, master, FREQ[n] * 2, t, b * beat, 0.5, 'triangle');
      bell(ctx, master, FREQ[n] * 4, t, b * beat * 0.5, 0.06, 'sine');
      t += b * beat;
    }
    // lugn bas på första slaget i varje takt
    BASS.forEach((n, i) => bell(ctx!, master!, FREQ[n], ctx!.currentTime + 0.1 + i * 4 * beat, 2 * beat, 0.25, 'sine'));
    // paus på två takter, sedan om igen
    timer = setTimeout(play, (MELODY_BEATS + 8) * beat * 1000);
  };
  play();
}

export function stopXmasMusic() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (master && ctx) {
    const m = master;
    m.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
    setTimeout(() => m.disconnect(), 600);
  }
  master = null;
}
