import { readable, type Readable } from 'svelte/store';

export type PaginatedReadable<T = any> = Readable<{
  data: T[];
  next: () => Promise<boolean>;
  ended: boolean;
}>;

export function createPaginatedList<T = any>(
  source: Readable<T[]>,
  opts: { pageSize?: number; initialPageCount?: number } = {}
): PaginatedReadable<T> {
  const pageSize = opts.pageSize ?? 25;
  const initialPageCount = Math.max(1, opts.initialPageCount ?? 1);

  let full: T[] = [];
  let pageEnd = 0; // exclusive
  let ended = true;

  let notify: (v: { data: T[]; next: () => Promise<boolean>; ended: boolean }) => void = () => {};

  const next = async () => {
    if (ended) return false;
    const remaining = full.length - pageEnd;
    const take = Math.min(pageSize, remaining);
    pageEnd += take;
    ended = pageEnd >= full.length;
    notify({ data: full.slice(0, pageEnd), next, ended });
    return !ended;
  };

  const store = readable<{ data: T[]; next: () => Promise<boolean>; ended: boolean }>(
    { data: [], next, ended },
    (set) => {
      notify = set;
      const unsub = source.subscribe((arr) => {
        full = Array.isArray(arr) ? arr : [];
        pageEnd = 0;
        ended = full.length === 0;
        if (!ended) {
          pageEnd = Math.min(pageSize * initialPageCount, full.length);
        }
        ended = pageEnd >= full.length;
        set({ data: full.slice(0, pageEnd), next, ended });
      });
      return () => unsub();
    }
  );

  return store;
}
