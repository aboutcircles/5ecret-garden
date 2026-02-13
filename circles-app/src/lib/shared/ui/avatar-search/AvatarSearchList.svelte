<script lang="ts">
  import { setContext } from 'svelte';
  import { ethers } from 'ethers';
  import { get, writable } from 'svelte/store';
  import type { Address } from '@circles-sdk/utils';
  import type { SearchProfileResult } from '$lib/shared/model/profile';
  import { circles } from '$lib/shared/state/circles';
  import { contacts } from '$lib/shared/state/contacts';
  import { profileBookmarksStore } from '$lib/areas/settings/state/profileBookmarks';
  import { SEARCH_POLICY } from '$lib/shared/ui/lists/utils/searchPolicies';
  import { createPaginatedList } from '$lib/shared/state/paginatedList';
  import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
  import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
  import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';
  import { buildLocalAvatarSearchRows } from './avatarSearch.local';
  import { mergeAvatarSearchRows } from './avatarSearch.merge';
  import { searchRemoteAvatarRows } from './avatarSearch.remote';
  import type { AvatarSearchItem } from './avatarSearch.types';
  import AvatarSearchRow from './AvatarSearchRow.svelte';

  const ACTIVATE_CTX_KEY = 'avatar-search-row-activate';

  interface Props {
    searchType?: 'send' | 'group' | 'contact' | 'global';
    selectedAddress?: string | undefined;
    onselect?: (address: Address, profile?: SearchProfileResult) => void;
    oninvite?: (address: Address) => void;
    ontrust?: (address: Address) => void;
    avatarTypes?: string[];
    inputDataAttribute?: string;
    searchPlaceholder?: string;
    titleLabel?: string;
  }

  let {
    searchType = 'send',
    selectedAddress = $bindable(undefined),
    onselect,
    oninvite,
    ontrust,
    avatarTypes,
    inputDataAttribute,
    searchPlaceholder = 'Search by name or address',
    titleLabel,
  }: Props = $props();

  const PAGE_SIZE = 25;
  const query = writable('');
  const mergedRowsStore = writable<AvatarSearchItem[]>([]);
  const paginatedRows = createPaginatedList(mergedRowsStore, { pageSize: PAGE_SIZE });

  let listScopeEl: HTMLDivElement | null = $state(null);
  let remoteRows: AvatarSearchItem[] = $state([]);
  let remoteLoading = $state(false);
  let remoteError: string | null = $state(null);
  let searchSeq = 0;
  let remoteDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
  let resultByAddress = $state<Record<string, SearchProfileResult>>({});

  const minRemoteLength = SEARCH_POLICY.MIN_REMOTE_QUERY_LENGTH;
  const inputAttributes = $derived.by(() => {
    const attrs = new Set<string>(['data-avatar-search-input']);
    for (const attr of (inputDataAttribute ?? '').split(/\s+/).map((v) => v.trim()).filter(Boolean)) {
      attrs.add(attr);
    }
    return Array.from(attrs).join(' ');
  });

  const computedTitle = $derived(
    titleLabel
      ?? (searchType === 'send'
        ? 'Recipient'
        : searchType === 'contact'
          ? 'Found Account'
          : searchType === 'global'
            ? 'Search'
            : 'Group')
  );

  const queryText = $derived(($query ?? '').toString());
  const queryTrimmed = $derived(queryText.trim());
  const queryLower = $derived(queryTrimmed.toLowerCase());

  const localRows = $derived.by(() => {
    return buildLocalAvatarSearchRows($contacts?.data ?? {}, $profileBookmarksStore ?? [], queryLower);
  });

  const mergedRows = $derived.by(() => mergeAvatarSearchRows(localRows, remoteRows, queryLower));
  const preferredRows = $derived.by(() => {
    if (queryTrimmed.length > 0) return mergedRows;

    const preferred = mergedRows.filter((row) => row.isVipBookmarked || row.isBookmarked || row.isContact);
    const vip = preferred.filter((row) => row.isVipBookmarked);
    const bookmarked = preferred.filter((row) => !row.isVipBookmarked && row.isBookmarked);
    const contactsOnly = preferred.filter((row) => !row.isVipBookmarked && !row.isBookmarked && row.isContact);
    return [...vip, ...bookmarked, ...contactsOnly].slice(0, 20);
  });

  const showEmpty = $derived(!remoteLoading && queryTrimmed.length > 0 && mergedRows.length === 0);
  const canInviteTrust = $derived(ethers.isAddress(queryTrimmed) && searchType === 'contact');

  $effect(() => {
    if (queryTrimmed.length === 0 && Object.keys(resultByAddress).length > 0) {
      resultByAddress = {};
    }
  });

  setContext(ACTIVATE_CTX_KEY, (item: AvatarSearchItem) => {
    const key = String(item.address).toLowerCase();
    const known = resultByAddress[key];
    onselect?.(item.address as Address, known);
  });

  const onInputArrowDown = createListInputArrowDownHandler({
    getScope: () => listScopeEl,
    rowSelector: '[data-avatar-search-row]',
  });

  $effect(() => {
    selectedAddress = queryText;
  });

  $effect(() => {
    mergedRowsStore.set(preferredRows);
  });

  $effect(() => {
    const q = queryTrimmed;

    if (remoteDebounceTimeout) {
      clearTimeout(remoteDebounceTimeout);
      remoteDebounceTimeout = null;
    }

    searchSeq += 1;
    remoteError = null;

    if (q.length < minRemoteLength) {
      remoteRows = [];
      remoteLoading = false;
      resultByAddress = {};
      return;
    }

    const seq = searchSeq;
    remoteDebounceTimeout = setTimeout(async () => {
      remoteLoading = true;
      try {
        const sdk = get(circles);
        const rows = await searchRemoteAvatarRows({ sdk, query: q, avatarTypes });
        if (seq !== searchSeq) return;

        remoteRows = rows;
        const nextMap: Record<string, SearchProfileResult> = {};
        for (const row of rows) {
          nextMap[row.address.toLowerCase()] = {
            address: row.address as Address,
            name: row.name,
            avatarType: row.avatarType,
            avatarVersion: row.avatarVersion,
            registeredName: null,
            lastUpdatedAt: undefined,
          } as SearchProfileResult;
        }
        resultByAddress = nextMap;
      } catch (e) {
        if (seq !== searchSeq) return;
        remoteRows = [];
        remoteError = e instanceof Error ? e.message : 'Remote search failed';
      } finally {
        if (seq === searchSeq) remoteLoading = false;
      }
    }, SEARCH_POLICY.REMOTE_DEBOUNCE_MS);

    return () => {
      if (remoteDebounceTimeout) {
        clearTimeout(remoteDebounceTimeout);
        remoteDebounceTimeout = null;
      }
      searchSeq += 1;
    };
  });

  function onInviteClick(): void {
    if (!canInviteTrust) return;
    oninvite?.(queryTrimmed as Address);
  }

  function onTrustClick(): void {
    if (!canInviteTrust) return;
    ontrust?.(queryTrimmed as Address);
  }
</script>

<div data-avatar-search-list-scope bind:this={listScopeEl}>
  <p class="menu-title pl-0">{computedTitle}</p>

  <ListShell
    query={query}
    searchPlaceholder={searchPlaceholder}
    onInputKeydown={onInputArrowDown}
    inputDataAttribute={inputAttributes}
    loading={false}
    error={remoteError}
    isEmpty={false}
    wrapInListContainer={false}
  >
    <div class="-mt-1 mb-3 text-xs text-base-content/60 flex items-center gap-2">
      <span>{preferredRows.length} result(s)</span>
      {#if queryTrimmed.length === 0}
        <span>• Showing bookmarks and contacts first</span>
      {/if}
      {#if queryTrimmed.length > 0 && queryTrimmed.length < minRemoteLength}
        <span>• Type at least {minRemoteLength} chars for remote search</span>
      {/if}
      {#if remoteLoading}
        <span class="inline-flex items-center gap-1">
          <span class="loading loading-spinner loading-xs text-primary" aria-hidden="true"></span>
          <span>Searching network…</span>
        </span>
      {/if}
    </div>

    {#if preferredRows.length > 0}
      <GenericList
        store={paginatedRows}
        row={AvatarSearchRow}
        getKey={(item) => item.key}
        rowHeight={64}
        maxPlaceholderPages={1}
        expectedPageSize={PAGE_SIZE}
      />
    {:else if showEmpty}
      <div class="text-center py-4">
        {#if canInviteTrust}
          <button class="btn mt-2" onclick={onInviteClick}>Invite {queryTrimmed}</button>
          {#if ontrust}
            <br />
            <button class="btn mt-4" onclick={onTrustClick}>Trust {queryTrimmed}</button>
          {/if}
        {:else}
          <p>No accounts found.</p>
        {/if}
      </div>
    {/if}
  </ListShell>
</div>
