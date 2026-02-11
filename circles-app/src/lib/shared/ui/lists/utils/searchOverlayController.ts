import { writable, type Writable } from 'svelte/store';

export interface SearchOverlayControllerOptions<TItem> {
  search: (query: string) => Promise<TItem[]>;
  debounceMs?: number;
}

export interface SearchOverlayController<TItem> {
  query: Writable<string>;
  searchOpen: Writable<boolean>;
  searching: Writable<boolean>;
  error: Writable<string | null>;
  result: Writable<TItem[]>;
  onQueryChanged: (queryText: string) => void;
  open: () => void;
  closeNow: () => void;
  clearAndClose: () => void;
  dispose: () => void;
}

export function createSearchOverlayController<TItem>(
  options: SearchOverlayControllerOptions<TItem>
): SearchOverlayController<TItem> {
  const debounceMs = options.debounceMs ?? 250;

  const query = writable('');
  const searchOpen = writable(false);
  const searching = writable(false);
  const error = writable<string | null>(null);
  const result = writable<TItem[]>([]);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let seq = 0;

  function clearDebounce(): void {
    if (!debounceTimer) return;
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  async function runSearch(q: string, token: number): Promise<void> {
    searching.set(true);
    error.set(null);
    try {
      const rows = await options.search(q);
      if (token !== seq) return;
      result.set(rows);
      error.set(null);
    } catch (e) {
      if (token !== seq) return;
      result.set([]);
      error.set(e instanceof Error ? e.message : String(e));
    } finally {
      if (token === seq) {
        searching.set(false);
      }
    }
  }

  function onQueryChanged(queryText: string): void {
    const q = queryText.trim();

    clearDebounce();
    seq += 1;

    if (!q) {
      searchOpen.set(false);
      result.set([]);
      error.set(null);
      searching.set(false);
      return;
    }

    searchOpen.set(true);
    const token = seq;
    debounceTimer = setTimeout(() => {
      void runSearch(q, token);
    }, debounceMs);
  }

  function open(): void {
    searchOpen.set(true);
  }

  function closeNow(): void {
    searchOpen.set(false);
    result.set([]);
    error.set(null);
    searching.set(false);
    clearDebounce();
  }

  function clearAndClose(): void {
    query.set('');
    closeNow();
  }

  function dispose(): void {
    clearDebounce();
  }

  return {
    query,
    searchOpen,
    searching,
    error,
    result,
    onQueryChanged,
    open,
    closeNow,
    clearAndClose,
    dispose,
  };
}
