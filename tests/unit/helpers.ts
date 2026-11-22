import { baseRecord, emptyDataset } from '../../src/domain/defaults';
import type { Dataset, Drop, Item } from '../../src/domain/types';

export function mkDrop(p: Partial<Drop> = {}): Drop {
  return { ...baseRecord(p.id), name: 'Testdrop', date: '2026-10-01', shipping: 0, customs: 0, shippingDate: null, customsDate: null, status: 'hemma', note: '', ok: 0, ...p };
}
export function mkItem(p: Partial<Item> = {}): Item {
  return {
    ...baseRecord(p.id), dropId: 'd1', name: 'Plagg', category: 'Jeans', brand: '', model: '', size: '', cost: 10000, weightKg: 0.8,
    salePrice: 0, saleDate: null, platform: null, productId: '', comment: '', ok: 0, saleBooking: 'individual', location: '', listedAt: null, returnedAt: null, ...p,
  };
}
export function ds(drops: Drop[], items: Item[]): Dataset {
  const d = emptyDataset();
  d.drops = drops;
  d.items = items;
  return d;
}
/** Paket enligt specen: n plagg med jämnt fördelat värde och vikt. */
export function paket(id: string, value: number, shipping: number, customs: number, weight: number, n: number) {
  const drop = mkDrop({ id, shipping, customs });
  const per = Math.floor(value / n);
  const items = Array.from({ length: n }, (_, i) =>
    mkItem({ id: `${id}-${i}`, dropId: id, cost: i === 0 ? value - per * (n - 1) : per, weightKg: Math.round((weight / n) * 1000) / 1000 }),
  );
  return { drop, items };
}
