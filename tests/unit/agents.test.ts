import { describe, expect, it } from 'vitest';
import { AGENTS, agoText, inlineParts, latestByAgent, mood, nextRun, parseMarkdown, stockholmToDate, whenText, type AgentRun } from '../../src/domain/agents';

const run = (p: Partial<AgentRun>): AgentRun => ({ id: 'x', agent: 'reminder', at: '2026-11-24T09:31:00Z', trigger: 'schema', status: 'klar', title: 't', summary: 's', body: '', highlights: [], ...p });

describe('agentbyn: tider i svensk tid', () => {
  it('omvandlar svensk väggklocka till rätt ögonblick, vinter och sommar', () => {
    expect(stockholmToDate(2026, 11, 24, 10, 30).toISOString()).toBe('2026-11-24T09:30:00.000Z');
    expect(stockholmToDate(2026, 6, 15, 10, 30).toISOString()).toBe('2026-06-15T08:30:00.000Z');
  });
  it('nästa körning för Reminder (varje dag 08:20 och 12:40)', () => {
    const s = AGENTS.find((a) => a.id === 'reminder')!.schedule;
    expect(nextRun(s, new Date('2026-11-24T06:00:00Z'))!.toISOString()).toBe('2026-11-24T07:20:00.000Z');
    expect(nextRun(s, new Date('2026-11-24T08:00:00Z'))!.toISOString()).toBe('2026-11-24T11:40:00.000Z');
    expect(nextRun(s, new Date('2026-11-24T12:00:00Z'))!.toISOString()).toBe('2026-11-25T07:20:00.000Z');
  });
  it('nästa körning för Advisor (varje morgon 08:20), Reviewer (mån, ons, fre 08:20) och Noter (varje kväll 20:40)', () => {
    const now = new Date('2026-11-24T12:00:00Z'); // tisdag
    expect(nextRun(AGENTS.find((a) => a.id === 'advisor')!.schedule, now)!.toISOString()).toBe('2026-11-25T07:20:00.000Z');
    expect(nextRun(AGENTS.find((a) => a.id === 'reviewer')!.schedule, now)!.toISOString()).toBe('2026-11-25T07:20:00.000Z');
    expect(nextRun(AGENTS.find((a) => a.id === 'reviewer')!.schedule, new Date('2026-11-27T08:00:00Z'))!.toISOString()).toBe('2026-11-30T07:20:00.000Z');
    expect(nextRun(AGENTS.find((a) => a.id === 'noter')!.schedule, now)!.toISOString()).toBe('2026-11-24T19:40:00.000Z');
  });
  it('alla sju agenter finns, Planner och Marketer har schema', () => {
    expect(AGENTS.map((a) => a.id).sort()).toEqual(['advisor', 'builder', 'marketer', 'noter', 'planner', 'reminder', 'reviewer']);
    expect(nextRun(AGENTS.find((a) => a.id === 'planner')!.schedule, new Date('2026-11-24T12:00:00Z'))!.toISOString()).toBe('2026-11-24T19:40:00.000Z');
  });
  it('Builder har inget schema', () => {
    expect(nextRun(AGENTS.find((a) => a.id === 'builder')!.schedule)).toBeNull();
  });
  it('texter för tid', () => {
    const now = new Date('2026-11-24T12:00:00Z');
    expect(agoText('2026-11-24T11:59:30Z', now)).toBe('nyss');
    expect(agoText('2026-11-24T11:40:00Z', now)).toBe('för 20 min sedan');
    expect(agoText('2026-11-24T09:31:00Z', now)).toBe('idag 10:31');
    expect(agoText('2026-11-23T09:31:00Z', now)).toBe('igår 10:31');
    expect(agoText('2026-11-12T09:31:00Z', now)).toBe('12 nov');
    expect(whenText(new Date('2026-11-25T09:30:00Z'), now)).toBe('imorgon 10:30');
    expect(whenText(new Date('2026-11-30T07:40:00Z'), now)).toBe('mån 08:40');
  });
});

describe('agentbyn: körningar', () => {
  it('senaste körningen per agent', () => {
    const l = latestByAgent([run({ id: 'a', at: '2026-11-20T09:00:00Z' }), run({ id: 'b', at: '2026-11-24T09:00:00Z' }), run({ id: 'c', agent: 'noter' })]);
    expect(l.reminder!.id).toBe('b');
    expect(l.noter!.id).toBe('c');
    expect(l.advisor).toBeUndefined();
  });
  it('figurens läge', () => {
    const rem = AGENTS.find((a) => a.id === 'reminder')!;
    const bld = AGENTS.find((a) => a.id === 'builder')!;
    expect(mood(rem, undefined, new Date('2026-11-24T07:15:00Z'))).toBe('jobbar');
    expect(mood(rem, run({ at: '2026-11-24T07:21:00Z' }), new Date('2026-11-24T09:00:00Z'))).toBe('nyss klar');
    expect(mood(rem, run({ at: '2026-11-23T11:41:00Z' }), new Date('2026-11-24T10:00:00Z'))).toBe('vilar');
    expect(mood(bld, undefined, new Date('2026-11-24T15:00:00Z'))).toBe('väntar');
  });
});

describe('agentbyn: rapporter i Markdown', () => {
  it('rubriker, listor, tabeller och stycken', () => {
    const b = parseMarkdown('# Rubrik\n\nEtt stycke\nsom fortsätter.\n\n- ett\n- två\n\n1. först\n2. sen\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n---');
    expect(b.map((x) => x.kind)).toEqual(['h', 'p', 'ul', 'ol', 'table', 'hr']);
    expect(b[1]).toEqual({ kind: 'p', text: 'Ett stycke som fortsätter.' });
    expect(b[4]).toEqual({ kind: 'table', head: ['A', 'B'], rows: [['1', '2']] });
  });
  it('fetstil', () => {
    expect(inlineParts('Sålt **800 kr** idag')).toEqual([
      { text: 'Sålt ', bold: false },
      { text: '800 kr', bold: true },
      { text: ' idag', bold: false },
    ]);
  });
});
