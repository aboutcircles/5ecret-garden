<script lang="ts">
  import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
  import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
  import { isVipProfileBookmark, profileBookmarksStore } from '$lib/areas/settings/state/profileBookmarks';
  import { contacts } from '$lib/shared/state/contacts';
  import { circles } from '$lib/shared/state/circles';
  import { createPaginatedList } from '$lib/shared/state/paginatedList';
  import { SEARCH_POLICY } from '$lib/shared/ui/lists/utils/searchPolicies';
  import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';
  import { searchProfilesRpc } from '$lib/shared/data/circles/searchProfiles';
  import { get } from 'svelte/store';
  import { writable } from 'svelte/store';
  import AvatarSearchRow from './AvatarSearchRow.svelte';
  import { compareAvatarSearchItems, computeLocalRank, computeTextRank } from './avatarSearch.rank';
  import type { AvatarSearchItem } from './avatarSearch.types';

  const PAGE_SIZE = 25;
  const MIN_REMOTE_QUERY_LENGTH = SEARCH_POLICY.MIN_REMOTE_QUERY_LENGTH;
  const REMOTE_DEBOUNCE_MS = SEARCH_POLICY.REMOTE_DEBOUNCE_MS;

  const query = writable('');
  let listScopeEl: HTMLDivElement | null = $state(null);
  let remoteRows: AvatarSearchItem[] = $state([]);
  let remoteLoading = $state(false);
  let remoteError: string | null = $state(null);
  let searchSeq = 0;
  let remoteDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

  const mergedRowsStore = writable<AvatarSearchItem[]>([]);
  const paginatedRows = createPaginatedList(mergedRowsStore, { pageSize: PAGE_SIZE });

  function normalizeAddress(value: string | null | undefined): string {
    return String(value ?? '').trim().toLowerCase();
  }

  function makeBaseItem(address: string): AvatarSearchItem {
    return {
      key: address,
      address,
      blockNumber: 0,
      transactionIndex: 0,
      logIndex: 0,
      hasProfile: false,
      isContact: false,
      isBookmarked: false,
      isVipBookmarked: false,
      localRank: 0,
      remoteRank: 0,
    };
  }

  function matchesQuery(address: string, name: string | undefined, q: string): boolean {
    if (!q) return true;
    const addressLc = normalizeAddress(address);
    const nameLc = String(name ?? '').toLowerCase();
    return addressLc.includes(q) || nameLc.includes(q);
  }

  function mergeRows(local: AvatarSearchItem[], remote: AvatarSearchItem[], q: string): AvatarSearchItem[] {
    const merged = new Map<string, AvatarSearchItem>();

    for (const item of local) {
      merged.set(normalizeAddress(item.address), { ...item });
    }

    for (const r of remote) {
      const key = normalizeAddress(r.address);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { ...r });
        continue;
      }

      const next: AvatarSearchItem = {
        ...existing,
        ...r,
        address: existing.address || r.address,
        name: existing.name || r.name,
        avatarType: existing.avatarType || r.avatarType,
        avatarVersion: existing.avatarVersion ?? r.avatarVersion,
        hasProfile: existing.hasProfile || r.hasProfile,
        isContact: existing.isContact || r.isContact,
        isBookmarked: existing.isBookmarked || r.isBookmarked,
        isVipBookmarked: existing.isVipBookmarked || r.isVipBookmarked,
        trustRelation: existing.trustRelation ?? r.trustRelation,
      };
      next.localRank = computeLocalRank(next);
      next.remoteRank = Math.max(existing.remoteRank ?? 0, r.remoteRank ?? 0);
      next.key = next.address;
      merged.set(key, next);
    }

    const rows = Array.from(merged.values());
    rows.sort((a, b) => compareAvatarSearchItems(a, b, q));
    return rows;
  }

  let localRows: AvatarSearchItem[] = $derived.by(() => {
    const q = ($query ?? '').trim().toLowerCase();
    const contactData = $contacts?.data ?? {};
    const bookmarks = $profileBookmarksStore ?? [];
    const map = new Map<string, AvatarSearchItem>();

    for (const [addressRaw, contact] of Object.entries(contactData)) {
      const address = normalizeAddress(addressRaw);
      if (!address) continue;
      const name = contact?.contactProfile?.name as string | undefined;
      if (!matchesQuery(address, name, q)) continue;

      const row = makeBaseItem(address);
      row.name = name;
      row.avatarType = contact?.avatarInfo?.type;
      row.avatarVersion = contact?.avatarInfo?.version;
      row.hasProfile = !!(name && name.trim().length > 0);
      row.isContact = true;
      row.trustRelation = contact?.row?.relation;
      row.localRank = computeLocalRank(row);
      row.remoteRank = computeTextRank(row, q);
      map.set(address, row);
    }

    for (const bookmark of bookmarks) {
      const address = normalizeAddress(bookmark?.address);
      if (!address) continue;
      const existing = map.get(address) ?? makeBaseItem(address);
      if (!matchesQuery(address, existing.name, q)) continue;
      existing.isBookmarked = true;
      existing.isVipBookmarked = isVipProfileBookmark(bookmark);
      existing.localRank = computeLocalRank(existing);
      existing.remoteRank = computeTextRank(existing, q);
      map.set(address, existing);
    }

    const rows = Array.from(map.values());
    rows.sort((a, b) => compareAvatarSearchItems(a, b, q));
    return rows;
  });

  async function searchRemoteProfiles(q: string): Promise<AvatarSearchItem[]> {
    const sdk = get(circles);
    if (!sdk?.circlesRpc) return [];

    const list = await searchProfilesRpc(sdk, {
      query: q,
      limit: SEARCH_POLICY.DEFAULT_REMOTE_LIMIT,
      offset: 0,
      avatarTypes: undefined,
    });

    return list
      .map((entry): AvatarSearchItem | null => {
        const address = normalizeAddress(entry?.address);
        if (!address) return null;

        const item = makeBaseItem(address);
        item.name = typeof entry?.name === 'string' ? entry.name : undefined;
        item.avatarType = typeof entry?.avatarType === 'string' ? entry.avatarType : undefined;
        item.avatarVersion = typeof entry?.avatarVersion === 'number' ? entry.avatarVersion : undefined;
        item.hasProfile = !!(item.name && item.name.trim().length > 0);
        item.remoteRank = computeTextRank(item, q);
        return item;
      })
      .filter((v): v is AvatarSearchItem => v !== null);
  }

  $effect(() => {
    const q = ($query ?? '').trim();

    if (remoteDebounceTimeout) {
      clearTimeout(remoteDebounceTimeout);
      remoteDebounceTimeout = null;
    }

    // Invalidate any in-flight request for previous query values.
    searchSeq += 1;

    remoteError = null;

    if (q.length < MIN_REMOTE_QUERY_LENGTH) {
      remoteRows = [];
      remoteLoading = false;
      return;
    }

    const seq = searchSeq;
    remoteDebounceTimeout = setTimeout(async () => {
      remoteLoading = true;
      try {
        const rows = await searchRemoteProfiles(q);
        if (seq === searchSeq) {
          remoteRows = rows;
          remoteError = null;
        }
      } catch (e) {
        if (seq === searchSeq) {
          remoteRows = [];
          remoteError = e instanceof Error ? e.message : 'Remote search failed';
        }
      } finally {
        if (seq === searchSeq) {
          remoteLoading = false;
        }
      }
    }, REMOTE_DEBOUNCE_MS);

    return () => {
      if (remoteDebounceTimeout) {
        clearTimeout(remoteDebounceTimeout);
        remoteDebounceTimeout = null;
      }
      // Invalidate in-flight response after teardown.
      searchSeq += 1;
    };
  });

  let mergedRows: AvatarSearchItem[] = $derived.by(() => {
    const q = ($query ?? '').trim().toLowerCase();
    return mergeRows(localRows, remoteRows, q);
  });

  $effect(() => {
    mergedRowsStore.set(mergedRows);
  });

  const onInputArrowDown = createListInputArrowDownHandler({
    getScope: () => listScopeEl,
    rowSelector: '[data-avatar-search-row]'
  });
</script>

<div data-avatar-search-list-scope bind:this={listScopeEl}>
  <ListShell
    query={query}
    searchPlaceholder="Search avatars by name or address"
    inputDataAttribute="data-avatar-search-input"
    onInputKeydown={onInputArrowDown}
    loading={remoteLoading}
    error={remoteError}
    isEmpty={mergedRows.length === 0}
    emptyLabel="No matches"
    wrapInListContainer={false}
  >
    <div class="-mt-1 mb-3 text-xs text-base-content/60 flex items-center gap-2">
      <span>{mergedRows.length} result(s)</span>
      {#if ($query ?? '').trim().length > 0 && ($query ?? '').trim().length < MIN_REMOTE_QUERY_LENGTH}
        <span>• Type at least {MIN_REMOTE_QUERY_LENGTH} chars for remote search</span>
      {/if}
      {#if remoteLoading}
        <span class="inline-flex items-center gap-1">
          <span class="loading loading-spinner loading-xs text-primary" aria-hidden="true"></span>
          <span>Searching network…</span>
        </span>
      {/if}
    </div>

    <GenericList
      store={paginatedRows}
      row={AvatarSearchRow}
      getKey={(item) => item.key}
      rowHeight={64}
      maxPlaceholderPages={1}
      expectedPageSize={PAGE_SIZE}
    />
  </ListShell>
</div>
