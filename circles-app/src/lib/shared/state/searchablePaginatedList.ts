import type { Address } from '@circles-sdk/utils';
import type { Readable, Writable } from 'svelte/store';
import { derived, writable } from 'svelte/store';
import { createPaginatedList } from '$lib/shared/state/paginatedList';
import {
  createFilteredAddresses,
  createProfileNameStore,
  type ProfileNameMap,
} from '$lib/shared/utils/searchableProfiles';

type SearchablePaginatedListResult<T> = {
  searchQuery: Writable<string>;
  profileNames: Readable<ProfileNameMap>;
  filteredItems: Readable<T[]>;
  paginatedItems: Readable<{ data: T[]; next: () => Promise<boolean>; ended: boolean }>;
};

export function createSearchablePaginatedList<T>(
  items: Readable<T[]>,
  opts: {
    pageSize?: number;
    addressOf: (item: T) => Address;
  }
): SearchablePaginatedListResult<T> {
  const searchQuery = writable('');

  const addresses = derived(items, ($items) => ($items ?? []).map((it) => opts.addressOf(it)));
  const profileNames = createProfileNameStore(addresses);
  const filteredAddresses = createFilteredAddresses(addresses, searchQuery, profileNames);

  const filteredItems = derived([items, filteredAddresses], ([$items, $filtered]) => {
    const allowed = new Set(($filtered ?? []).map((a) => String(a).toLowerCase()));
    return ($items ?? []).filter((it) => allowed.has(String(opts.addressOf(it)).toLowerCase()));
  });

  const paginatedItems = createPaginatedList(filteredItems, { pageSize: opts.pageSize });

  return { searchQuery, profileNames, filteredItems, paginatedItems };
}
