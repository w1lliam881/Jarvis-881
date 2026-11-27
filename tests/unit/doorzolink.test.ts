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
