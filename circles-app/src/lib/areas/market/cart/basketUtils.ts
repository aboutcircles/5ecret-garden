import type { Basket, BasketLine, SdkCartItem } from './types';

export function normalizeAddr(a: string): string {
  return String(a ?? '').toLowerCase();
}

export function normalizeSku(s: string): string {
  return String(s ?? '').toLowerCase();
}

export function lineSeller(line: BasketLine): string | null {
  const s = line?.seller;
  return typeof s === 'string' && s ? normalizeAddr(s) : null;
}

export function lineSku(line: BasketLine): string | null {
  const sku = line?.orderedItem?.sku ?? line?.sku ?? line?.orderedItem?.orderedItem?.sku ?? null;
  return typeof sku === 'string' && sku ? normalizeSku(sku) : null;
}

export function lineQty(line: BasketLine): number {
  const q = line?.orderQuantity ?? line?.quantity ?? 0;
  const n = typeof q === 'number' ? q : Number(q ?? 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function toSdkItemsFromBasket(basket: Basket | null): SdkCartItem[] {
  const items = Array.isArray(basket?.items) ? basket!.items : [];
  const out: SdkCartItem[] = [];
  for (const it of items) {
    const seller = lineSeller(it);
    const sku = lineSku(it);
    const quantity = lineQty(it);
    if (!seller || !sku) continue;
    out.push({ seller, sku, quantity, imageUrl: typeof it?.imageUrl === 'string' ? it.imageUrl : undefined });
  }
  return out;
}

export function normalizeImageUrl(u: unknown): string | undefined {
  const s = typeof u === 'string' ? u.trim() : '';
  return s.length > 0 ? s : undefined;
}
