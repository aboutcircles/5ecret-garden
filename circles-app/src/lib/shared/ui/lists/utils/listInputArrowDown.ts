export interface ListInputArrowDownOptions {
  getScope?: () => ParentNode | null | undefined;
  rowSelector: string;
}

export function focusActiveTabAbove(source: HTMLElement | null): boolean {
  if (!source || typeof document === 'undefined') return false;

  const tablists = Array.from(document.querySelectorAll<HTMLElement>('[role="tablist"]'));
  let nearestAbove: HTMLElement | null = null;

  for (const tablist of tablists) {
    if (tablist === source || tablist.contains(source)) continue;
    if (tablist.getClientRects().length === 0) continue;

    const pos = tablist.compareDocumentPosition(source);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
      nearestAbove = tablist;
    }
  }

  if (!nearestAbove) return false;

  const activeTab =
    nearestAbove.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]:not([disabled])')
    ?? nearestAbove.querySelector<HTMLElement>('[role="tab"][tabindex="0"]:not([disabled])');

  if (!activeTab) return false;
  activeTab.focus();
  return true;
}

/**
 * Canonical input-level ArrowDown handoff for list search inputs.
 *
 * Behavior:
 * - ArrowDown on the input focuses the first matching row in scope.
 * - If scoped lookup fails, falls back to a document-level lookup.
 */
export function createListInputArrowDownHandler(options: ListInputArrowDownOptions) {
  return function onInputArrowDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp') {
      if (focusActiveTabAbove(event.currentTarget as HTMLElement | null)) {
        event.preventDefault();
      }
      return;
    }

    if (event.key !== 'ArrowDown') return;

    const scoped = options.getScope?.() ?? null;
    const firstRow =
      scoped?.querySelector<HTMLElement>(options.rowSelector) ??
      (typeof document !== 'undefined' ? document.querySelector<HTMLElement>(options.rowSelector) : null);

    if (!firstRow) return;

    event.preventDefault();
    firstRow.focus();
  };
}
