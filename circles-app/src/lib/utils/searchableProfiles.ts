import { getProfile } from '$lib/utils/profile';
import type { Readable } from 'svelte/store';
import { derived, writable } from 'svelte/store';
import type { Address } from '@circles-sdk/utils';

export type ProfileNameMap = Record<string, string>;

export function createProfileNameStore(addresses: Readable<Address[]>): Readable<ProfileNameMap> {
  const names = writable<ProfileNameMap>({});

  addresses.subscribe((list) => {
    (list ?? []).forEach((addr) => {
      const key = String(addr).toLowerCase();
      names.update((current) => {
        if (current[key] !== undefined) return current;
        getProfile(addr)
          .then((profile) => {
            names.update((next) => ({ ...next, [key]: profile?.name ?? '' }));
          })
          .catch(() => {
            names.update((next) => ({ ...next, [key]: '' }));
          });
        return current;
      });
    });
  });

  return names;
}

export function createFilteredAddresses(
  addresses: Readable<Address[]>,
  searchQuery: Readable<string>,
  profileNames: Readable<ProfileNameMap>
): Readable<Address[]> {
  return derived([addresses, searchQuery, profileNames], ([$addresses, $query, $names]) => {
    const q = ($query ?? '').trim().toLowerCase();
    if (!q) return $addresses ?? [];
    return ($addresses ?? []).filter((addr) => {
      const key = String(addr).toLowerCase();
      const name = ($names[key] ?? '').toLowerCase();
      return key.includes(q) || name.includes(q);
    });
  });
}