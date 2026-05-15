<script lang="ts">
  import { setContext } from 'svelte';
  import { ethers } from 'ethers';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { get, writable } from 'svelte/store';
  import type { Address } from '@aboutcircles/sdk-types';
  import type { SearchProfileResult } from '$lib/shared/model/profile';
  import { circles } from '$lib/shared/state/circles';
  import { contacts } from '$lib/shared/state/contacts';
  import {
    profileBookmarksService,
    profileBookmarksStore,
    profileBookmarksUnpublishedChangesStore,
  } from '$lib/areas/settings/state/profileBookmarks';
  import { openConfirmPopup, openInfoPopup } from '$lib/shared/ui/shell/confirmDialogs';
  import { SEARCH_POLICY } from '$lib/shared/ui/lists/utils/searchPolicies';
  import { createPaginatedList } from '$lib/shared/state/paginatedList';
  import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
  import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
  import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';
  import { buildLocalAvatarSearchRows } from './avatarSearch.local';
  import {
    buildDirectAddressSelectionRows,
    mergeAvatarSearchRows,
    shouldAutoSelectSingleRowOnEnter,
  } from './avatarSearch.merge';
  import { searchRemoteAvatarRows } from './avatarSearch.remote';
  import type { AvatarSearchItem } from './avatarSearch.types';
  import AvatarSearchRow from './AvatarSearchRow.svelte';
  import AvatarRowPlaceholder from '$lib/shared/ui/lists/placeholders/AvatarRowPlaceholder.svelte';

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
    const directAddressRows = buildDirectAddressSelectionRows(queryTrimmed, mergedRows);
    if (directAddressRows) return directAddressRows;

    if (queryTrimmed.length > 0) return mergedRows;

    const preferred = mergedRows.filter((row) => row.isVipBookmarked || row.isBookmarked || row.isContact);
    const vip = preferred.filter((row) => row.isVipBookmarked);
    const bookmarked = preferred.filter((row) => !row.isVipBookmarked && row.isBookmarked);
    const contactsOnly = preferred.filter((row) => !row.isVipBookmarked && !row.isBookmarked && row.isContact);
    return [...vip, ...bookmarked, ...contactsOnly].slice(0, 20);
  });

  const showEmpty = $derived(!remoteLoading && queryTrimmed.length > 0 && mergedRows.length === 0);
  const canInviteTrust = $derived(ethers.isAddress(queryTrimmed) && searchType === 'contact');

  const isQueryEmpty = $derived(queryTrimmed.length === 0);
  const vipRows = $derived(isQueryEmpty ? preferredRows.filter((r) => r.isVipBookmarked) : []);
  const favoriteRows = $derived(
    isQueryEmpty ? preferredRows.filter((r) => r.isBookmarked && !r.isVipBookmarked) : []
  );
  const contactRows = $derived(
    isQueryEmpty
      ? preferredRows.filter((r) => r.isContact && !r.isBookmarked && !r.isVipBookmarked)
      : []
  );

  const queryAddressLower = $derived(
    ethers.isAddress(queryTrimmed) ? queryTrimmed.toLowerCase() : null
  );
  const queryAddressIsBookmarked = $derived.by((): boolean => {
    if (!queryAddressLower) return false;
    const list = $profileBookmarksStore ?? [];
    return list.some((b) => b.address === queryAddressLower);
  });
  const queryAddressInMergedRows = $derived.by((): boolean => {
    if (!queryAddressLower) return false;
    return mergedRows.some((r) => String(r.address).toLowerCase() === queryAddressLower);
  });
  const showAddToFavoritesCta = $derived(
    !!queryAddressLower && !queryAddressIsBookmarked && !queryAddressInMergedRows
  );

  const hasUnpublishedChanges = $derived($profileBookmarksUnpublishedChangesStore);
  const totalLocalBookmarks = $derived(($profileBookmarksStore ?? []).length);
  const currentOwnerKey = $derived(
    (avatarState.avatar?.address ?? '').toLowerCase() || null
  );
  let pulledForOwner: string | null = $state(null);
  let pulling = $state(false);
  let pullError: string | null = $state(null);
  let syncing = $state(false);
  const baselineKnown = $derived(
    !!currentOwnerKey && pulledForOwner === currentOwnerKey && !pullError
  );
  const showSyncFooter = $derived(
    isQueryEmpty && hasUnpublishedChanges && totalLocalBookmarks > 0 && !pulling
  );
  const canPublish = $derived(baselineKnown);

  $effect(() => {
    const owner = currentOwnerKey;
    if (!owner) return;
    if (pulledForOwner === owner || pulling) return;
    void pullFromProfile({ silent: true });
  });

  async function pullFromProfile(opts: { silent: boolean }): Promise<void> {
    if (pulling) return;
    const ownerAtStart = currentOwnerKey;
    if (!ownerAtStart) return;
    pulling = true;
    pullError = null;
    try {
      await profileBookmarksService.syncFromProfile();
      if (currentOwnerKey === ownerAtStart) {
        pulledForOwner = ownerAtStart;
      }
    } catch (e) {
      pullError = e instanceof Error ? e.message : 'Unknown error';
      if (!opts.silent) {
        await openInfoPopup({
          title: 'Could not load favorites from profile',
          message: pullError,
          tone: 'error',
        });
      }
    } finally {
      pulling = false;
    }
  }

  function addQueryAddressToFavorites(): void {
    if (!queryAddressLower) return;
    profileBookmarksService.upsertProfile(queryAddressLower);
  }

  async function onSyncToProfileClick(): Promise<void> {
    if (syncing) return;
    if (!canPublish) {
      await openInfoPopup({
        title: 'Cannot save favorites yet',
        message:
          'We could not check your profile for existing favorites. Saving now might overwrite a list saved from another device. Please retry the load first.',
        tone: 'warning',
      });
      return;
    }
    const confirmed = await openConfirmPopup({
      title: 'Sync favorites to your profile',
      message:
        "Your favorites will be saved to your public Circles profile on IPFS. Anyone who looks up your address can read this list. Continue?",
      confirmLabel: 'Sync now',
      cancelLabel: 'Keep local',
    });
    if (!confirmed) return;

    syncing = true;
    try {
      await profileBookmarksService.publishToProfile();
      await openInfoPopup({
        title: 'Favorites synced',
        message: 'Your favorites are now saved to your Circles profile.',
        tone: 'success',
      });
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'Unknown error';
      await openInfoPopup({
        title: 'Sync failed',
        message: `Could not sync favorites: ${detail}`,
        tone: 'error',
      });
    } finally {
      syncing = false;
    }
  }

  $effect(() => {
    if (queryTrimmed.length === 0 && Object.keys(resultByAddress).length > 0) {
      resultByAddress = {};
    }
  });

  function activateItem(item: AvatarSearchItem): void {
    const key = String(item.address).toLowerCase();
    const known = resultByAddress[key];
    onselect?.(item.address as Address, known);
  }

  setContext(ACTIVATE_CTX_KEY, (item: AvatarSearchItem) => {
    activateItem(item);
  });

  const onInputArrowDown = createListInputArrowDownHandler({
    getScope: () => listScopeEl,
    rowSelector: '[data-avatar-search-row]',
  });

  function onSearchInputKeydown(event: KeyboardEvent): void {
    const input = event.currentTarget instanceof HTMLInputElement ? event.currentTarget : null;
    const hasInputFocus = !!input && document.activeElement === input;

    if (shouldAutoSelectSingleRowOnEnter(event.key, preferredRows.length, event.isComposing, hasInputFocus)) {
      event.preventDefault();
      activateItem(preferredRows[0]);
      return;
    }

    onInputArrowDown(event);
  }

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
    onInputKeydown={onSearchInputKeydown}
    inputDataAttribute={inputAttributes}
    loading={false}
    error={remoteError}
    isEmpty={false}
    wrapInListContainer={false}
  >
    <div class="-mt-1 mb-3 text-xs text-base-content/60 flex items-center gap-2">
      <span>{preferredRows.length} result(s)</span>
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

    {#if isQueryEmpty && preferredRows.length > 0}
      {#if vipRows.length > 0}
        <p class="menu-title pl-0 text-xs uppercase tracking-wider text-warning mt-1 mb-1">
          ★ VIPs
        </p>
        <div class="mb-2">
          {#each vipRows as row (row.key)}
            <AvatarSearchRow item={row} />
          {/each}
        </div>
      {/if}

      {#if favoriteRows.length > 0}
        <p class="menu-title pl-0 text-xs uppercase tracking-wider text-warning mt-1 mb-1">
          ★ Favorites
        </p>
        <div class="mb-2">
          {#each favoriteRows as row (row.key)}
            <AvatarSearchRow item={row} />
          {/each}
        </div>
      {/if}

      {#if contactRows.length > 0}
        <p class="menu-title pl-0 text-xs uppercase tracking-wider text-base-content/60 mt-1 mb-1">
          Contacts
        </p>
        <div>
          {#each contactRows as row (row.key)}
            <AvatarSearchRow item={row} />
          {/each}
        </div>
      {/if}
    {:else if preferredRows.length > 0}
      <GenericList
        store={paginatedRows}
        row={AvatarSearchRow}
        getKey={(item) => item.key}
        rowHeight={64}
        maxPlaceholderPages={2}
        expectedPageSize={PAGE_SIZE}
        placeholderRow={AvatarRowPlaceholder}
      />
      {#if showAddToFavoritesCta}
        <div class="mt-2 text-center">
          <button class="btn btn-sm btn-outline btn-warning" onclick={addQueryAddressToFavorites}>
            ☆ Add {queryTrimmed.slice(0, 6)}…{queryTrimmed.slice(-4)} to favorites
          </button>
        </div>
      {/if}
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
        {#if showAddToFavoritesCta}
          <div class="mt-3">
            <button class="btn btn-sm btn-outline btn-warning" onclick={addQueryAddressToFavorites}>
              ☆ Add {queryTrimmed.slice(0, 6)}…{queryTrimmed.slice(-4)} to favorites
            </button>
          </div>
        {/if}
      </div>
    {:else if isQueryEmpty}
      <div class="text-center py-4 text-sm text-base-content/60">
        <p>No favorites or contacts yet.</p>
        <p class="mt-1">Paste an address above or search by name to send Circles.</p>
      </div>
    {/if}

    {#if pulling && isQueryEmpty}
      <div class="mt-4 border-t border-base-300 pt-3 text-xs text-base-content/60 flex items-center gap-2">
        <span class="loading loading-spinner loading-xs" aria-hidden="true"></span>
        <span>Loading favorites from your profile…</span>
      </div>
    {:else if showSyncFooter}
      <div class="mt-4 border-t border-base-300 pt-3 text-xs text-base-content/70 space-y-2">
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-0.5">
            <p class="font-medium text-base-content/80">
              {baselineKnown
                ? 'Local changes not yet saved to your public profile.'
                : pullError
                  ? 'Cannot check your profile for existing favorites.'
                  : 'Favorites are saved on this device only.'}
            </p>
            <p class="text-base-content/60">
              Saving copies the list to your <span class="font-medium">public Circles profile</span> on IPFS — anyone who looks up your address can read it.
            </p>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-xs whitespace-nowrap"
            disabled={syncing || !canPublish}
            title={!canPublish && pullError ? 'Retry loading from profile first to avoid overwriting' : undefined}
            onclick={onSyncToProfileClick}
          >
            {#if syncing}
              <span class="loading loading-spinner loading-xs" aria-hidden="true"></span>
              Saving…
            {:else}
              {baselineKnown ? 'Update public profile' : 'Save to public profile'}
            {/if}
          </button>
        </div>
        {#if pullError}
          <p class="text-error/80">
            Could not check your profile for existing favorites ({pullError}).
            <button type="button" class="link link-hover ml-1" onclick={() => pullFromProfile({ silent: false })}>
              Retry
            </button>
          </p>
        {/if}
      </div>
    {:else if isQueryEmpty && pullError && totalLocalBookmarks === 0}
      <div class="mt-4 border-t border-base-300 pt-3 text-xs text-error/80">
        Could not load favorites from your profile ({pullError}).
        <button type="button" class="link link-hover ml-1" onclick={() => pullFromProfile({ silent: false })}>
          Retry
        </button>
      </div>
    {/if}
  </ListShell>
</div>
