import { describe, expect, it } from 'vitest';
import { findAmounts, findDate, guessCategory, parseCsv, parseLines, parseMail } from '../../src/domain/parse';

describe('inklistring av drops', () => {
  it('"11x Nudie jeans 132,19" ger 11 plagg', () => {
    const r = parseLines('11x Nudie jeans 132,19');
    expect(r).toHaveLength(11);
    expect(r[0]).toMatchObject({ name: 'Nudie jeans', category: 'Jeans', cost: 13219, weightKg: 0.8 });
  });
  it('kategori efter semikolon och gissning', () => {
    const r = parseLines('A&F tröja; Tröjor; 150\nBurberry t-shirt 215\nBarbour jacka 224,90 kr');
    expect(r.map((x) => [x.category, x.cost])).toEqual([['Tröjor', 15000], ['T-shirts', 21500], ['Jackor', 22490]]);
  });
  it('gissar kategori', () => {
    expect(guessCategory('Levi\'s 501')).toBe('Jeans');
    expect(guessCategory('Cable knit')).toBe('Tröjor');
    expect(guessCategory('Oxford shirt')).toBe('Skjortor');
  });
});

describe('mejltext', () => {
  it('hittar datum och belopp', () => {
    expect(findDate('Datum: 8 nov. 2026')).toBe('2026-11-08');
    expect(findDate('2026-11-09 12:00')).toBe('2026-11-09');
    expect(findAmounts('Summa: 849,00 kr och 1 300 SEK')).toEqual([84900, 130000]);
  });
  it('Vinted-försäljning', () => {
    const d = parseMail('Vinted\nDu har sålt en vara!\nArtikel: Levi\'s 505\nTotal: 759,00 kr\n9 nov 2026');
    expect(d).toMatchObject({ source: 'Vinted', eventType: 'sale', amount: 75900, date: '2026-11-09', platform: 'Vinted' });
  });
  it('Doorzo tull', () => {
    const d = parseMail('Doorzo\nCustoms duty and import tax for your parcel\nAmount: 1 339 SEK\n2026-10-14');
    expect(d).toMatchObject({ source: 'Doorzo', eventType: 'customs', amount: 133900, date: '2026-10-14' });
  });
});

describe('csv', () => {
  it('läser semikolon och citattecken', () => {
    expect(parseCsv('a;b;c\n"x;y";2;"he said ""hi"""')).toEqual([['a', 'b', 'c'], ['x;y', '2', 'he said "hi"']]);
  });
});
