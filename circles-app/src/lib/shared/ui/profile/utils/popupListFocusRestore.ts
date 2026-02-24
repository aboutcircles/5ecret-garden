import { onDestroy } from 'svelte';
import { popupState } from '$lib/shared/state/popup';

interface PopupListFocusRestoreOptions {
  getScope: () => HTMLElement | null;
  rowSelector: string;
  rowAddressAttribute?: string;
}

/**
 * Restores focus to the previously focused list row after popup back-navigation.
 *
 * Pattern:
 * - when popup depth increases, capture currently focused row address
 * - when popup depth decreases, restore focus to that row in the same list scope
 */
export function usePopupListFocusRestore(options: PopupListFocusRestoreOptions): void {
  const rowAddressAttribute = options.rowAddressAttribute ?? 'data-row-address';

  let lastFocusedAddress: string | null = null;
  let previousPopupDepth = 0;

  function captureFocusedRowAddress(): void {
    const scope = options.getScope();
    if (!scope || typeof document === 'undefined') return;

    const active = document.activeElement as HTMLElement | null;
    const selector = `${options.rowSelector}[${rowAddressAttribute}]`;
    const row = active?.closest<HTMLElement>(selector);
    if (!row || !scope.contains(row)) return;

    const attr = rowAddressAttribute.startsWith('data-')
      ? rowAddressAttribute.slice(5)
      : rowAddressAttribute;

    const key = attr.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    const address = (row.dataset as Record<string, string | undefined>)[key];
    if (address) {
      lastFocusedAddress = address;
    }
  }

  const unsubscribePopup = popupState.subscribe((state) => {
    const depth = state.content ? state.stack.length + 1 : 0;

    if (depth > previousPopupDepth) {
      captureFocusedRowAddress();
    }

    if (depth < previousPopupDepth && lastFocusedAddress) {
      requestAnimationFrame(() => {
        const scope = options.getScope();
        if (!scope) return;
        const row = scope.querySelector<HTMLElement>(
          `${options.rowSelector}[${rowAddressAttribute}="${lastFocusedAddress}"]`
        );
        row?.focus({ preventScroll: true });
      });
    }

    previousPopupDepth = depth;
  });

  onDestroy(() => {
    unsubscribePopup();
  });
}
