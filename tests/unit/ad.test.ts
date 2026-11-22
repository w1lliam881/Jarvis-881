import { describe, expect, it } from 'vitest';
import { adText, measuresFilled } from '../../src/domain/ad';
import { mkItem } from './helpers';

const s = { adModelHeight: 178, adModelWeight: 65 };

describe('annonsgenerator', () => {
  it('följer 881:s mall för jeans exakt', () => {
    const i = mkItem({ category: 'Jeans', brand: 'Nudie Jeans', model: 'Slim Jim', fit: 'bootcut', size: 'W32', measurements: { Midja: 41, Ytterben: 103, Innerben: 79, Benöppning: 20 } });
    expect(adText(i, s)).toBe(
      'Säljer nu dessa Nudie Jeans i modellen Slim Jim. Jeansen har en bootcut passform och är i storlek w32 men utgå alltid från angivna mått! Midja: 41 Ytterben: 103 Innerben: 79 Benöppning: 20 Modellen är 178 och väger 65!',
    );
  });
  it('jacka i singular och utan passform', () => {
    const i = mkItem({ category: 'Jackor', name: 'Ulljacka', brand: 'Barbour', size: 'M', measurements: { Bröstbredd: 55.5, Längd: 70 } });
    expect(adText(i, s)).toBe('Säljer nu denna Barbour (Ulljacka). Jackan är i storlek m men utgå alltid från angivna mått! Bröstbredd: 55,5 Längd: 70 Modellen är 178 och väger 65!');
  });
  it('gissar märket från namnet och hoppar över modellen om längd saknas', () => {
    const i = mkItem({ category: 'Jeans', name: "Levi's 501", brand: '', model: '501' });
    expect(adText(i, { adModelHeight: 0, adModelWeight: 0 })).toBe("Säljer nu dessa Levi's i modellen 501.");
  });
  it('räknar ifyllda mått', () => {
    expect(measuresFilled(mkItem({ category: 'Jeans', measurements: { Midja: 40 } }))).toEqual({ filled: 1, total: 4 });
  });
});
