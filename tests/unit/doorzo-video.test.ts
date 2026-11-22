import { describe, expect, it } from 'vitest';
import src from '../../fixtures/v14-audit.json';
import { importV14 } from '../../src/domain/import-v14';
import { buildSearch } from '../../src/domain/doorzo';
import { assessIdea, suggestIdeas, IDEAS, marketingSummary } from '../../src/domain/video';

describe('doorzo', () => {
  it('svenska till japanska med svensk betydelse bredvid', () => {
    const r = buildSearch("Levi's 501 jeans vintage W32 svarta");
    expect(r.groups.map((g) => g.title)).toEqual(['Direkt översättning', 'Mer detaljerade sökningar', 'Alternativa stavningar och namn', 'Storlek och skick', 'Smarta tillägg som hittar unika plagg']);
    expect(r.groups[0].terms[0].ja).toBe('リーバイス 501 ジーンズ');
    for (const g of r.groups) for (const t of g.terms) expect(t.sv.length).toBeGreaterThan(0);
    expect(JSON.stringify(r.groups)).toContain('W32');
    expect(r.understood.join(' ')).not.toMatch(/Storlek S/);
    expect(buildSearch('levis jeans storlek m').understood).toContain('Storlek M');
  });
  it('förstår svenska ord', () => {
    const r = buildSearch('nudie jeans otvättade');
    expect(r.understood).toEqual(expect.arrayContaining(['Nudie Jeans']));
    expect(JSON.stringify(r)).toContain('リジッド');
  });
});

describe('video', () => {
  const { dataset } = importV14(src as any);
  it('idéer har unika nycklar', () => expect(new Set(IDEAS.map((i) => i.key)).size).toBe(IDEAS.length));
  it('föreslår idéer anpassade efter lagret och hoppar över använda', () => {
    const s = suggestIdeas(dataset, { type: 'Alla', length: 0 }, 5, '2026-11-21');
    expect(s).toHaveLength(5);
    for (const i of s) expect(i.title).not.toMatch(/\{/);
    const used = { ...dataset, ideas: [{ id: 'x', version: 1, createdAt: '', updatedAt: '', ideaKey: s[0].idea.key, status: 'använd' as const }] };
    expect(suggestIdeas(used, { type: 'Alla', length: 0 }, 5, '2026-11-21').map((i) => i.idea.key)).not.toContain(s[0].idea.key);
  });
  it('respekterar förutsättningar', () => {
    const d = { ...dataset, settings: { ...dataset.settings, videoAbilities: { face: false, voice: false, package: false, garments: true, time: false } } };
    for (const i of suggestIdeas(d, { type: 'Alla', length: 0 }, 20)) expect(i.idea.needs.every((n) => n === 'garments')).toBe(true);
  });
  it('bedömer en egen idé', () => {
    const a = assessIdea(dataset, { text: 'Gissa vad jag betalade för dessa Levi\'s 505 från Japan? Visar frakt och tull.', type: 'Unboxing', lengthSec: 30, hour: 19 }, '2026-11-21');
    expect(a.score).toBeGreaterThanOrEqual(1);
    expect(a.score).toBeLessThanOrEqual(10);
    expect(a.good.length + a.improve.length).toBeGreaterThan(0);
  });
  it('marknadsföringsanalys utan klipp', () => {
    expect(marketingSummary(dataset).count).toBe(0);
  });
});

import { inferBrand } from '../../src/domain/doorzo';
describe('märke från namn', () => {
  it('gissar märket', () => {
    expect(inferBrand('Momotaro tröja')).toBe('Momotaro');
    expect(inferBrand("Levi's 501")).toBe("Levi's");
    expect(inferBrand('RL DS hoodie grå/svart')).toBe('Ralph Lauren');
    expect(inferBrand('Mörkblå v-neck')).toBe('');
  });
});

import { watchView } from '../../src/domain/watch';
import { defaultSettings } from '../../src/domain/defaults';
import { history } from '../../src/domain/metrics';
describe('bevakningar', () => {
  it('ger japanska termer, länkar och maxpris i yen', () => {
    const { dataset } = importV14(src as any);
    const H = history(dataset, '2026-11-21');
    const w = { id: 'w', version: 1, createdAt: '', updatedAt: '', query: "levis 501 jeans", watch: true, category: 'Jeans' as const, maxPrice: 30000 };
    const v = watchView(w, H, defaultSettings());
    expect(v.terms[0].ja).toContain('リーバイス');
    expect(v.maxYen).toBe(4200);
    expect(v.links[0].url).toContain('price_max=4200');
    const auto = watchView({ ...w, maxPrice: null }, H, defaultSettings());
    expect(auto.maxSource).toBe('krav');
  });
});
