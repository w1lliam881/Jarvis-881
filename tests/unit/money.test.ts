import { describe, expect, it } from 'vitest';
const sp = (x: string) => x.replace(/[\u00a0\u202f]/g, ' ');
import { allocate, kr, parseKr, parseOre, toOre, signedPct } from '../../src/domain/money';

describe('pengar', () => {
  it('räknar i ören utan flyttalsfel', () => {
    expect(toOre(132.19)).toBe(13219);
    expect(toOre(0.1 + 0.2)).toBe(30);
    expect(toOre(3072.61)).toBe(307261);
  });
  it('tolkar svensk inmatning', () => {
    expect(parseKr('1 234,50')).toBe(1234.5);
    expect(parseKr('1.234,50')).toBe(1234.5);
    expect(parseKr('350 kr')).toBe(350);
    expect(parseKr('350:-')).toBe(350);
    expect(parseKr('')).toBe(0);
    expect(parseOre('132,19')).toBe(13219);
  });
  it('formaterar kronor', () => {
    expect(sp(kr(1667900))).toBe('16 679 kr');
    expect(sp(kr(-1300))).toBe('−13 kr');
    expect(sp(kr(13219, { decimals: true }))).toBe('132,19 kr');
    expect(sp(signedPct(505.2))).toBe('+505 %');
    expect(sp(signedPct(-13))).toBe('−13 %');
  });
  it('fördelar exakt utan att tappa ören', () => {
    const a = allocate(200100, [1, 1, 1]);
    expect(a.reduce((s, x) => s + x, 0)).toBe(200100);
    expect(a).toEqual([66700, 66700, 66700]);
    const b = allocate(100, [1, 1, 1]);
    expect(b).toEqual([34, 33, 33]);
    expect(allocate(1000, [0, 0])).toEqual([500, 500]);
    expect(allocate(1000, [3, 1])).toEqual([750, 250]);
    expect(allocate(0, [1, 2])).toEqual([0, 0]);
  });
});
