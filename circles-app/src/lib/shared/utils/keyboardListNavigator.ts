export interface KeyboardListNavigatorOptions {
  getRows: () => HTMLElement[];
  focusInput: () => void;
  onActivateRow?: (row: HTMLElement) => void;
}

export function createKeyboardListNavigator(options: KeyboardListNavigatorOptions) {
  function focusFirstRow(): void {
    options.getRows()[0]?.focus();
  }

  function onInputArrowDown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown') return;
    const rows = options.getRows();
    if (rows.length === 0) return;
    event.preventDefault();
    rows[0]?.focus();
  }

  function onRowKeydown(event: KeyboardEvent): void {
    const current = event.currentTarget as HTMLElement | null;
    if (!current) return;

    const target = event.target as HTMLElement | null;
    // If focus is inside a nested interactive element (e.g. link/button/checkbox),
    // let that element handle Enter/Space/Arrow keys.
    if (target && target !== current) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      options.onActivateRow?.(current);
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    const rows = options.getRows();
    const index = rows.indexOf(current);
    if (index === -1) return;

    event.preventDefault();

    if (event.key === 'ArrowUp' && index === 0) {
      options.focusInput();
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
