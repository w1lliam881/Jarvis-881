// Agenterna i Agentbyn: vilka de är, när de jobbar och hur deras arbete sammanfattas.
// Själva agenterna körs i Claude Code (se .claude/agents). Appen visar bara vad de gjort.

export type AgentId = 'builder' | 'reviewer' | 'advisor' | 'reminder' | 'noter' | 'planner' | 'marketer';

export interface AgentRun {
  id: string;
  agent: AgentId;
  at: string; // ISO-tid
  trigger: 'schema' | 'kommando' | 'test';
  status: 'klar' | 'varning' | 'fel';
  title: string;
  summary: string;
  body: string;
  highlights: string[];
}

/** Schema i svensk tid. days: 0 = söndag … 6 = lördag. times: klockslag [timme, minut], en eller flera per dag. */
export interface AgentSchedule {
  days: number[];
  times: [number, number][];
  label: string;
}

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

export interface AgentDef {
  id: AgentId;
  name: string;
  title: string;
  house: string;
  line: string;
  job: string[];
  never: string;
  command: string;
  schedule: AgentSchedule | null;
  /** Färger för figuren: hår/hatt, tröja, byxor, detalj */
  colors: { hat: string; shirt: string; pants: string; trim: string };
  roof: string;
  wall: string;
}

export const AGENTS: AgentDef[] = [
  {
    id: 'reminder',
    name: 'Reminder',
    title: 'Påminnaren',
    house: 'Klocktornet',
    line: 'Håller koll på vad som behöver göras, så att du slipper.',
    job: [
      'Går igenom dina uppgifter i Jarvis och vad som är försenat',
      'Säger till när lagret håller på att ta slut och det är dags att beställa',
      'Hittar plagg som inte fotats, publicerats eller legat för länge',
      'Räknar dina TikToks och säger till om det blivit tyst',
      'Flaggar bokföring som väntar och föreslår möte med kompisen när något stort ska bestämmas',
    ],
    never: 'Lägger inte in eller ändrar något själv. Du bestämmer.',
    command: '/reminder',
    schedule: { days: EVERY_DAY, times: [[8, 20], [12, 40]], label: 'Varje dag 08:20 och 12:40' },
    colors: { hat: '#E9B44C', shirt: '#C97B5A', pants: '#2B3A4A', trim: '#FFE2A8' },
    roof: '#C97B5A',
    wall: '#F4E6C8',
  },
  {
    id: 'advisor',
    name: 'Advisor',
    title: 'Rådgivaren',
    house: 'Observatoriet',
    line: 'Läser siffrorna och säger vad du borde göra härnäst.',
    job: [
      'Kort råd varje morgon, briefing inför veckan på måndag och avstämning på fredag',
      'Säsongsanpassade inköpsråd: vinter mer jeans, jackor och tröjor, färre t-shirts',
      'Hur länge lagret räcker och när nästa drop bör beställas',
      'Vilka kategorier och märken som ger mest vinst',
      'Vilka typer av klipp som fungerar',
      'Tre konkreta råd, med siffran de bygger på',
      'Granskar Planners planer och tränar honom (och tvärtom) i gruppchatten',
    ],
    never: 'Sätter aldrig pris på enskilda plagg. Råd om bokföring och skatt bör granskas av en redovisningskunnig.',
    command: '/advisor',
    schedule: { days: EVERY_DAY, times: [[8, 20]], label: 'Varje morgon 08:20 (efter Planner)' },
    colors: { hat: '#3B3670', shirt: '#6D8FB3', pants: '#1F2E40', trim: '#E9B44C' },
    roof: '#3B3670',
    wall: '#E6E3F2',
  },
  {
    id: 'noter',
    name: 'Noter',
    title: 'Sekreteraren',
    house: 'Skrivarstugan',
    line: 'Skriver veckans journal åt dig: vad ni gjort, när och hur mycket.',
    job: [
      'Läser ändringsloggen och ser vad du och kompisen gjort, dag för dag',
      'Räknar plagg, försäljning, verifikat, uppgifter och klipp',
      'Jämför med förra veckan',
      'Skriver en kort dagsanteckning varje kväll och hela veckans journal på söndagar',
    ],
    never: 'Skriver aldrig ut köpares namn eller adresser.',
    command: '/noter',
    schedule: { days: EVERY_DAY, times: [[20, 40]], label: 'Varje kväll 20:40 (veckojournal på söndagar)' },
    colors: { hat: '#6B3E1E', shirt: '#8FB9A8', pants: '#3E4C60', trim: '#F4F1E6' },
    roof: '#1F5A44',
    wall: '#F2EBDD',
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    title: 'Granskaren',
    house: 'Utkikstornet',
    line: 'Letar fel i appen innan de hinner ställa till något.',
    job: [
      'Kör alla tester och kontrollerar att appen bygger',
      'Letar efter fel som kan ge fel siffror i bokföringen',
      'Kollar säkerheten och att reglerna följs',
      'Listar vad som måste rättas, vad som borde rättas och idéer',
    ],
    never: 'Ändrar ingenting. Det gör Builder när du sagt ja.',
    command: '/reviewer',
    schedule: { days: [1, 3, 5], times: [[8, 20]], label: 'Måndag, onsdag och fredag 08:20' },
    colors: { hat: '#1A1A1A', shirt: '#E1EEE6', pants: '#2B3A4A', trim: '#9EDBB8' },
    roof: '#2B3A4A',
    wall: '#DDE6E0',
  },
  {
    id: 'planner',
    name: 'Planner',
    title: 'Planeraren',
    house: 'Kartkammaren',
    line: 'Din personliga planerare: antal, budget och tidsplan, med siffrorna i ryggen.',
    job: [
      'Planerar antal och budget för nästa drop utifrån säljtakt, säsong och senaste droppens storlek',
      'Växer lite för varje drop men aldrig mer än att det finns en buffert kvar',
      'Gör dags- och veckoplaner med datum, till exempel juldroppen och den nya hemsidan',
      'Räknar baklänges från deadlines: när du måste beställa, fota och publicera',
      'Jobbar ihop med Advisor: Advisor granskar planerna och Planner räknar på Advisors råd',
    ],
    never: 'Lägger inga beställningar och ändrar ingen data. Planerna är förslag tills du sagt ja.',
    command: '/planner',
    schedule: { days: EVERY_DAY, times: [[8, 20], [20, 40]], label: 'Varje dag 08:20 och 20:40' },
    colors: { hat: '#2C5D8A', shirt: '#E9B44C', pants: '#2B3A4A', trim: '#F4F1E6' },
    roof: '#2C5D8A',
    wall: '#E4ECF2',
  },
  {
    id: 'marketer',
    name: 'Marketer',
    title: 'Marknadsföraren',
    house: 'Studion',
    line: 'Planerar din TikTok och läser av vad som fungerar, utifrån det du själv lägger in.',
    job: [
      'Läser klippen du loggat: vad du gjorde (kryssen) och hur det gick (visningar, likes, sparade)',
      'Visar vilka format, längder och tider som ger mest för just ditt konto',
      'Planerar när och hur ofta du bör lägga upp',
      'Kopplar klipp till försäljning: sålde plaggen du visade?',
    ],
    never: 'Börjar inte ge idéer förrän du loggat minst 5 klipp med siffror. Idéerna bygger då på ditt eget innehåll.',
    command: '/marketer',
    schedule: { days: EVERY_DAY, times: [[20, 40]], label: 'Varje kväll 20:40 (när det finns klipp)' },
    colors: { hat: '#1A1A1A', shirt: '#C2324A', pants: '#1F2E40', trim: '#25F4EE' },
    roof: '#C2324A',
    wall: '#F2E2E4',
  },
  {
    id: 'builder',
    name: 'Builder',
    title: 'Byggaren',
    house: 'Verkstaden',
    line: 'Bygger det du ber om och testar innan det skickas.',
    job: [
      'Bygger nya funktioner och rättar fel i appen',
      'Följer reglerna: pengar i ören, inga priser per plagg, inga kostnader',
      'Kör alla tester och kollar både telefon och dator',
      'Lägger upp ändringen så att du kan godkänna den',
    ],
    never: 'Jobbar bara när du ber om något. Inget går ut utan att du slår ihop det.',
    command: '/builder',
    schedule: null,
    colors: { hat: '#E9B44C', shirt: '#1F5A44', pants: '#4A2E16', trim: '#E9B44C' },
    roof: '#8A3B22',
    wall: '#EAD7BC',
  },
];

export const agentById = (id: string): AgentDef | undefined => AGENTS.find((a) => a.id === id);

// ---------- Tid ----------

const TZ = 'Europe/Stockholm';

/** Svensk väggklocka för ett ögonblick: år, månad, dag, timme, minut, veckodag. */
export function stockholmParts(d: Date) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, wd };
}

/** Ögonblicket då klockan i Stockholm visar given tid. */
export function stockholmToDate(y: number, mo: number, d: number, h: number, mi: number): Date {
  let t = Date.UTC(y, mo - 1, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const p = stockholmParts(new Date(t));
    const shown = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
    t += Date.UTC(y, mo - 1, d, h, mi) - shown;
  }
  return new Date(t);
}

/** Nästa gång agenten jobbar enligt schemat, eller null om den bara jobbar på kommando. */
export function nextRun(s: AgentSchedule | null, now: Date = new Date()): Date | null {
  if (!s || !s.days.length || !s.times.length) return null;
  const p = stockholmParts(now);
  const times = [...s.times].sort((a, b) => a[0] * 60 + a[1] - (b[0] * 60 + b[1]));
  for (let i = 0; i <= 7; i++) {
    const base = new Date(Date.UTC(p.y, p.mo - 1, p.d + i, 12));
    const wd = base.getUTCDay();
    if (!s.days.includes(wd)) continue;
    for (const [h, m] of times) {
      const at = stockholmToDate(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), h, m);
      if (at.getTime() > now.getTime()) return at;
    }
  }
  return null;
}

/** "nyss", "för 5 min sedan", "igår 10:31", "12 nov" */
export function agoText(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const mins = Math.round((now.getTime() - d.getTime()) / 60000);
  if (mins < 2) return 'nyss';
  if (mins < 60) return `för ${mins} min sedan`;
  const a = stockholmParts(d);
  const b = stockholmParts(now);
  const time = `${String(a.h).padStart(2, '0')}:${String(a.mi).padStart(2, '0')}`;
  const dayN = (x: { y: number; mo: number; d: number }) => Date.UTC(x.y, x.mo - 1, x.d) / 86400000;
  const diff = dayN(b) - dayN(a);
  if (diff === 0) return `idag ${time}`;
  if (diff === 1) return `igår ${time}`;
  const months = ['jan', 'feb', 'mars', 'apr', 'maj', 'juni', 'juli', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return `${a.d} ${months[a.mo - 1]}`;
}

/** "idag 10:30", "imorgon 10:30", "mån 08:40" */
export function whenText(d: Date, now: Date = new Date()): string {
  const a = stockholmParts(d);
  const b = stockholmParts(now);
  const time = `${String(a.h).padStart(2, '0')}:${String(a.mi).padStart(2, '0')}`;
  const dayN = (x: { y: number; mo: number; d: number }) => Date.UTC(x.y, x.mo - 1, x.d) / 86400000;
  const diff = dayN(a) - dayN(b);
  if (diff === 0) return `idag ${time}`;
  if (diff === 1) return `imorgon ${time}`;
  return `${['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör'][a.wd]} ${time}`;
}

/** Senaste körningen per agent. */
export function latestByAgent(runs: AgentRun[]): Partial<Record<AgentId, AgentRun>> {
  const out: Partial<Record<AgentId, AgentRun>> = {};
  for (const r of runs) {
    const cur = out[r.agent];
    if (!cur || r.at > cur.at) out[r.agent] = r;
  }
  return out;
}

/** Vad figuren gör just nu i byn. */
export function mood(def: AgentDef, last: AgentRun | undefined, now: Date = new Date()): 'jobbar' | 'nyss klar' | 'väntar' | 'vilar' {
  const next = nextRun(def.schedule, now);
  if (next && next.getTime() - now.getTime() < 10 * 60000) return 'jobbar';
  if (last && now.getTime() - new Date(last.at).getTime() < 3 * 3600000) return 'nyss klar';
  if (!def.schedule) return 'väntar';
  return 'vilar';
}

// ---------- Enkel Markdown till block (rapporterna) ----------

export type MdBlock =
  | { kind: 'h'; level: number; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'hr' };

export function parseMarkdown(src: string): MdBlock[] {
  const lines = src.replace(/\r/g, '').split('\n');
  const out: MdBlock[] = [];
  let i = 0;
  const cells = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  while (i < lines.length) {
    const l = lines[i];
    const t = l.trim();
    if (!t) {
      i++;
      continue;
    }
    const h = t.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      out.push({ kind: 'h', level: h[1].length, text: h[2] });
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(t)) {
      out.push({ kind: 'hr' });
      i++;
      continue;
    }
    if (t.startsWith('|') && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1].trim())) {
      const head = cells(t);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      out.push({ kind: 'table', head, rows });
      continue;
    }
    if (/^[-*]\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].trim().replace(/^[-*]\s+/, ''));
      out.push({ kind: 'ul', items });
      continue;
    }
    if (/^\d+[.)]\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].trim().replace(/^\d+[.)]\s+/, ''));
      out.push({ kind: 'ol', items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|[-*]\s|\d+[.)]\s|\|)/.test(lines[i].trim())) para.push(lines[i++].trim());
    if (para.length) out.push({ kind: 'p', text: para.join(' ') });
    else i++;
  }
  return out;
}

/** Delar upp text i vanlig text och **fetstil**. */
export function inlineParts(s: string): { text: string; bold: boolean }[] {
  const out: { text: string; bold: boolean }[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), bold: false });
    out.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), bold: false });
  return out.map((p) => ({ ...p, text: p.text.replace(/`([^`]+)`/g, '$1') }));
}

// ---------- Chatt: telefonen i varje hus och gruppchatten i byn ----------

/** 'grupp' = byns gruppchatt. 'dm:advisor' osv. = telefonen i agentens hus. */
export type ChatThread = 'grupp' | `dm:${AgentId}`;

export interface AgentMessage {
  id: string;
  at: string; // ISO-tid
  thread: ChatThread;
  /** Agenten som skrev, eller 'du' när det är du (eller kompisen) som skrivit i appen. */
  sender: AgentId | 'du';
  /** Vem av er som skrev, när sender är 'du' (e-post eller namn). */
  author?: string | null;
  body: string;
  /** chatt = vanligt meddelande. plan = dagens/veckans plan. förslag = något agenten vill göra och som kräver ditt ja. */
  kind: 'chatt' | 'plan' | 'förslag';
  status: 'väntar' | 'godkänd' | 'avvisad' | null;
  replyTo: string | null;
}

export const dmThread = (id: AgentId): ChatThread => `dm:${id}`;

/**
 * Agenterna körs i fyra schemalagda rundor i Claude (molnmiljön Jarvis-881):
 * morgonrundan 08:20 (Reminder, Planner, Advisor, Reviewer mån/ons/fre), lunchrundan 12:40 (Reminder och byrådet),
 * kvällsrundan 20:40 (Marketer, Planner, Noter) och chattrundan varannan timme 10:15–22:15.
 * Chattsvaren: på det du skrivit i telefonerna svarar agenterna i chattrundan och i morgonrundan.
 */
export const CHAT_SCHEDULE: AgentSchedule = { days: EVERY_DAY, times: [[8, 20], [10, 15], [12, 15], [14, 15], [16, 15], [18, 15], [20, 15], [22, 15]], label: 'Varannan timme 08–22' };

/** Byrådet: agenterna pratar med varandra i gruppchatten en gång om dagen. */
export const COUNCIL_SCHEDULE: AgentSchedule = { days: EVERY_DAY, times: [[12, 40]], label: 'Varje dag 12:40' };

/** Dina meddelanden i en tråd som ingen agent har svarat på än. */
export function unanswered(msgs: AgentMessage[], thread: ChatThread): AgentMessage[] {
  const t = msgs.filter((m) => m.thread === thread).sort((a, b) => (a.at < b.at ? -1 : 1));
  const lastAgent = t.reduce<string>((acc, m) => (m.sender !== 'du' && m.at > acc ? m.at : acc), '');
  return t.filter((m) => m.sender === 'du' && m.at > lastAgent);
}

/** Förslag i gruppchatten som väntar på ditt ja eller nej. */
export function pendingProposals(msgs: AgentMessage[]): AgentMessage[] {
  return msgs.filter((m) => m.kind === 'förslag' && m.status === 'väntar').sort((a, b) => (a.at < b.at ? 1 : -1));
}

/** Meddelanden i en tråd, äldst först (som i en chatt). */
export function threadMessages(msgs: AgentMessage[], thread: ChatThread): AgentMessage[] {
  return msgs.filter((m) => m.thread === thread).sort((a, b) => (a.at < b.at ? -1 : 1));
}

/** Nya meddelanden från agenten sedan du senast tittade. */
export function unreadCount(msgs: AgentMessage[], thread: ChatThread, seenAt: string | null): number {
  return msgs.filter((m) => m.thread === thread && m.sender !== 'du' && (!seenAt || m.at > seenAt)).length;
}
