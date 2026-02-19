import { focusActiveTabAbove } from './listInputArrowDown';

export interface KeyboardListNavigatorOptions {
  getRows: (anchor?: HTMLElement | null) => HTMLElement[];
  focusInput: (anchor?: HTMLElement | null) => void;
  onActivateRow?: (row: HTMLElement) => void;
}

export function createKeyboardListNavigator(options: KeyboardListNavigatorOptions) {
  function focusFirstRow(): void {
    options.getRows(null)[0]?.focus();
  }

  function onInputArrowDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp') {
      if (focusActiveTabAbove(event.currentTarget as HTMLElement | null)) {
        event.preventDefault();
      }
      return;
    }

    if (event.key !== 'ArrowDown') return;
    const rows = options.getRows(event.currentTarget as HTMLElement | null);
    if (rows.length === 0) return;
    event.preventDefault();
    rows[0]?.focus();
  }

  function onRowKeydown(event: KeyboardEvent): void {
    const current = event.currentTarget as HTMLElement | null;
    if (!current) return;

    if (event.key === 'Escape') {
      // If a list row currently has focus, move focus back to the input and consume this ESC.
      // A subsequent ESC (while input is focused) is not intercepted here and can bubble up.
      event.preventDefault();
      event.stopPropagation();
      options.focusInput(current);
      return;
    }

    const target = event.target as HTMLElement | null;
    const isNestedTarget = !!target && target !== current;

    if (event.key === 'Enter' || event.key === ' ') {
      // Keep Enter/Space native for nested interactive controls (e.g. avatar link, checkbox).
      if (isNestedTarget) return;
      if (!options.onActivateRow) return;
      event.preventDefault();
      options.onActivateRow?.(current);
      return;
    }

    if (event.key === 'ArrowLeft') {
      const rows = options.getRows(current);
      if (rows.length === 0) return;
      event.preventDefault();
      rows[0]?.focus();
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    const rows = options.getRows(current);
    const index = rows.indexOf(current);
    if (index === -1) return;

    event.preventDefault();

    if (event.key === 'ArrowUp' && index === 0) {
      options.focusInput(current);
      return;
    }

    const nextIndex = event.key === 'ArrowDown' ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= rows.length) return;
    rows[nextIndex]?.focus();
  }

  function onRowClick(event: MouseEvent): void {
    const current = event.currentTarget as HTMLElement | null;
    current?.focus();
  }

  return {
    focusFirstRow,
    onInputArrowDown,
    onRowKeydown,
    onRowClick,
  };
}
