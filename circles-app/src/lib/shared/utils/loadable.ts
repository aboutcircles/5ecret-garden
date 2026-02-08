// circles-app/src/lib/utils/loadable.ts
import { writable, type Readable } from 'svelte/store';

export type LoadableState<T> = {
  value: T;
  loading: boolean;
  error: string | null;
};

export type Loadable<T> = Readable<LoadableState<T>> & {
  run(fn: () => Promise<T | void>): Promise<void>;
  reset(next?: T): void;
};

export function normalizeError(err: unknown): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || err.toString();
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * Shared async loading helper with stale-request guard.
 *
 * Usage in Svelte:
 *   const loader = createLoadable<T>(initial);
 *   const loading = $derived($loader.loading);
 *   const value = $derived($loader.value);
 */
export function createLoadable<T>(initial: T): Loadable<T> {
  const store = writable<LoadableState<T>>({
    value: initial,
    loading: false,
    error: null,
  });

  let requestId = 0;

  async function run(fn: () => Promise<T | void>): Promise<void> {
    const id = ++requestId;

    store.update((s) => ({
      ...s,
      loading: true,
      error: null,
    }));

    try {
      const result = await fn();

      if (id !== requestId) {
        return;
      }

      if (result !== undefined) {
        store.set({ value: result as T, loading: false, error: null });
      } else {
        store.update((s) => ({ ...s, loading: false }));
      }
    } catch (e) {
      if (id !== requestId) {
        return;
      }
      const msg = normalizeError(e);
      store.update((s) => ({ ...s, loading: false, error: msg }));
    }
  }

  function reset(next?: T): void {
    requestId += 1;
    store.set({
      value: next !== undefined ? next : initial,
      loading: false,
      error: null,
    });
  }

  return {
    subscribe: store.subscribe,
    run,
    reset,
  };
}
