import { browser } from '$app/environment';

const KEY_BASKET_ID = 'circles_market_basket_id';

export function readBasketId(): string | null {
  if (!browser) return null;
  try {
    const v = window.localStorage.getItem(KEY_BASKET_ID);
    return v && v.trim().length > 0 ? v.trim() : null;
  } catch {
    return null;
  }
}

export function writeBasketId(
  id: string | null,
  opts?: {
    /**
     * Called only in DEV builds when persistence failed, so UI can surface a helpful message.
     * The storage write itself remains a soft-fail.
     */
    onDevError?: (message: string) => void;
  },
): void {
  if (!browser) return;

  try {
    if (!id) {
      window.localStorage.removeItem(KEY_BASKET_ID);
    } else {
      window.localStorage.setItem(KEY_BASKET_ID, id);
    }
  } catch (e) {
    // Surface storage failures to aid debugging but keep soft-fail behavior
    console.error('[cart] Failed to persist basket id to localStorage:', e);
    try {
      const meta = typeof import.meta !== 'undefined' ? (import.meta as { env?: { DEV?: boolean } }) : null;
      if (meta?.env?.DEV) {
        const msg = e instanceof Error ? e.message : String(e ?? 'storage error');
        opts?.onDevError?.(`Basket storage unavailable: ${msg}`);
      }
    } catch {
      // no-op: avoid cascading errors
    }
  }
}
