export interface ListInputArrowDownOptions {
  getScope?: () => ParentNode | null | undefined;
  rowSelector: string;
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
