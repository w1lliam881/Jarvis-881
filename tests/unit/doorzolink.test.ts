import { describe, expect, it } from 'vitest';
import { doorzoComment, findLinks, parseDoorzoLink } from '../../src/domain/doorzolink';

const LINK =
  "https://www.doorzo.com/en/mall/mercari/detail/68747470733a2f2f7777772e6d6572636172692e636f6d2f6a702f6974656d732f6d32373836343035383937342f?Price=3000&Asin=m27864058974&Title=Levi%27s+511+USA%E8%A3%BDW29+L32+WHITE+OAK%E8%A3%BD%E8%B5%A4%E8%80%B3&Image=https://static.mercdn.net/item/detail/orig/photos/m27864058974_1.jpg?1794015573&SellerId=&SellerName=";

describe('Doorzo-länk till plagg', () => {
  it('läser Williams riktiga länk: märke, modell, storlek, kategori, pris och detaljer', () => {
    const d = parseDoorzoLink(LINK, 14)!;
    expect(d.brand).toBe("Levi's");
    expect(d.model).toBe('511');
    expect(d.size).toBe('W29 L32');
    expect(d.category).toBe('Jeans');
    expect(d.name).toBe("Levi's 511 W29 L32");
    expect(d.priceYen).toBe(3000);
    expect(d.cost).toBe(21429); // 3000 / 14 = 214,29 kr
    expect(d.mercariId).toBe('m27864058974');
    expect(d.mercariUrl).toBe('https://jp.mercari.com/item/m27864058974');
    expect(d.imageUrl).toContain('static.mercdn.net');
    expect(d.details).toEqual(['Made in USA', 'White Oak-denim (Cone Mills)', 'Selvedge (röd kant)']);
    expect(doorzoComment(d)).toContain('Mercari m27864058974');
  });

  it('katakana-märke, japansk storlek och jacka', () => {
    const t = encodeURIComponent('リーバイス デニムジャケット サイズM 日本製');
    const d = parseDoorzoLink(`https://www.doorzo.com/en/mall/mercari/detail/abc?Price=4500&Asin=m11112222333&Title=${t}`, 15)!;
    expect(d.brand).toBe("Levi's");
    expect(d.category).toBe('Jackor');
    expect(d.size).toBe('M');
    expect(d.cost).toBe(30000);
    expect(d.details).toContain('Made in Japan');
  });

  it('Nudie-modell och storlek i tum', () => {
    const t = encodeURIComponent('Nudie Jeans Grim Tim 31インチ 濃紺');
    const d = parseDoorzoLink(`https://www.doorzo.com/item?Price=2800&Asin=m99998888777&Title=${t}`, 14)!;
    expect(d.name).toBe('Nudie Jeans Grim Tim W31');
    expect(d.details).toContain('Mörk tvätt');
  });

  it('Mercari-länk utan titel ger ändå ID men inget pris', () => {
    const d = parseDoorzoLink('https://jp.mercari.com/item/m27864058974', 14)!;
    expect(d.mercariId).toBe('m27864058974');
    expect(d.priceYen).toBeNull();
    expect(d.cost).toBe(0);
  });

  it('andra länkar och skräp ger null, och flera länkar hittas i en text', () => {
    expect(parseDoorzoLink('https://www.vinted.se/items/1', 14)).toBeNull();
    expect(parseDoorzoLink('inte en länk', 14)).toBeNull();
    expect(findLinks(`${LINK}\nhttps://jp.mercari.com/item/m123456789 och text`)).toHaveLength(2);
  });
});

import { openDoorzoDrop, sharedLinks } from '../../src/domain/doorzolink';
describe('genvägar för Doorzo', () => {
  it('väljer senaste beställda droppen från veckan, annars ny drop', () => {
    const drops = [
      { id: 'a', date: '2026-11-10', status: 'beställd' },
      { id: 'b', date: '2026-11-24', status: 'beställd' },
      { id: 'c', date: '2026-11-26', status: 'hemma' },
      { id: 'd', date: '2026-11-25', status: 'beställd', deletedAt: '2026-11-25' },
    ];
    expect(openDoorzoDrop(drops, '2026-11-27')?.id).toBe('b');
    expect(openDoorzoDrop(drops, '2026-12-10')).toBeNull();
  });
  it('plockar länken ur det som delats till appen', () => {
    expect(sharedLinks('?text=Kolla%20https%3A%2F%2Fwww.doorzo.com%2Fitem%3FAsin%3Dm1234567890')).toBe('https://www.doorzo.com/item?Asin=m1234567890');
    expect(sharedLinks('?url=https%3A%2F%2Fexample.com')).toBe('');
  });
});

import { parseDoorzoText } from '../../src/domain/doorzolink';
describe('alla sorters Doorzo-länkar läggs in', () => {
  const t = (s: string) => parseDoorzoText(s, 14);
  it('länk utan titel och pris läggs ändå in, med sajt och id', () => {
    const [d] = t('https://www.doorzo.com/en/mall/mercari/detail/m27864058974');
    expect(d.store).toBe('Mercari');
    expect(d.itemId).toBe('m27864058974');
    expect(d.name).toBe('Mercari m27864058974');
    expect(d.priceYen).toBeNull();
    expect(d.imageUrl).toContain('m27864058974_1.jpg');
  });
  it('andra sajter via Doorzo: Yahoo, Rakuma, Surugaya, PayPay', () => {
    const items = t(
      [
        'https://www.doorzo.com/zh-hk/mall/yahoo/detail/x1234567890?Price=5000&Title=Levis%20501%20W32',
        'https://www.doorzo.com/en/mall/rakuma/detail/abc123def',
        'https://www.doorzo.com/en/mall/surugaya/detail/123456',
        'https://www.doorzo.com/en/mall/paypay/detail/z12345678',
      ].join('\n'),
    );
    expect(items.map((d) => d.store)).toEqual(['Yahoo Auktioner', 'Rakuma', 'Surugaya', 'PayPay Flea']);
    expect(items[0]).toMatchObject({ name: "Levi's 501 W32", priceYen: 5000, category: 'Jeans', itemId: 'x1234567890' });
  });
  it('utan https, korta delningslänkar och direktlänkar till sajterna', () => {
    expect(t('www.doorzo.com/en/mall/mercari/detail/m22222222222?price=2,800')[0]).toMatchObject({ itemId: 'm22222222222', priceYen: 2800 });
    expect(t('https://doorzo.app.link/AbCdEf123')[0]).toMatchObject({ store: 'Doorzo', sourceUrl: 'https://doorzo.app.link/AbCdEf123' });
    expect(t('https://page.auctions.yahoo.co.jp/jp/auction/x1234567890')[0].store).toBe('Yahoo Auktioner');
    expect(t('https://jp.mercari.com/item/m27864058974')[0].itemId).toBe('m27864058974');
  });
  it('titeln i Doorzos delningstext används, och okodade mellanslag i länken klipper inte av den', () => {
    expect(t('【Doorzo】Nudie Jeans Grim Tim W31 https://www.doorzo.com/en/mall/mercari/detail/m11111111111')[0].name).toBe('Nudie Jeans Grim Tim W31');
    const [d] = t("https://www.doorzo.com/en/mall/mercari/detail/m33333333333?Price=3000&Title=Levi's 511 USA製W29 L32&Image=https://static.mercdn.net/x.jpg");
    expect(d).toMatchObject({ name: "Levi's 511 W29 L32", priceYen: 3000, imageUrl: 'https://static.mercdn.net/x.jpg' });
  });
  it('samma plagg två gånger blir ett, med den länk som har mest uppgifter', () => {
    const items = t('https://www.doorzo.com/en/mall/mercari/detail/m27864058974\nhttps://www.doorzo.com/en/mall/mercari/detail/m27864058974?Price=3000');
    expect(items).toHaveLength(1);
    expect(items[0].priceYen).toBe(3000);
  });
  it('vanlig text och andra sajter ger inget', () => {
    expect(t('hej https://www.vinted.se/items/1 och google.com')).toHaveLength(0);
  });
});
