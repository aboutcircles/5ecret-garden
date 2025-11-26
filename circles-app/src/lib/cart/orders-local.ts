// src/lib/cart/orders-local.ts
import { browser } from '$app/environment';

const STORAGE_KEY = 'circles.recentOrderIds.v1';
const MAX_ITEMS = 100;

export type StoredOrderId = string;

function safeParse(json: string | null): StoredOrderId[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) {
      return arr.filter((x) => typeof x === 'string');
    }
  } catch {
    // ignore
  }
  return [];
}

export function listStoredOrderIds(): StoredOrderId[] {
  if (!browser) return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return safeParse(raw);
}

export function addStoredOrderId(id: StoredOrderId): void {
  if (!browser) return;
  const current = listStoredOrderIds();
  const next = [id, ...current.filter((x) => x !== id)].slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearStoredOrderIds(): void {
  if (!browser) return;
  localStorage.removeItem(STORAGE_KEY);
}
