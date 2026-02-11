<script lang="ts">
  import { get } from 'svelte/store';
  import type { Address } from '@circles-sdk/utils';
  import type { SearchProfileResult } from '$lib/domains/profile/model';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
  import ListStates from '$lib/shared/ui/lists/ListStates.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { popupControls } from '$lib/shared/state/popup';
  import { runTask } from '$lib/shared/utils/tasks';
  import { shortenAddress } from '$lib/shared/utils/shared';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
  import { createSearchOverlayController } from '$lib/shared/ui/lists/utils/searchOverlayController';
  import { registerOutsidePointerClose } from '$lib/shared/ui/lists/utils/outsidePointerClose';
  import { SEARCH_POLICY } from '$lib/shared/ui/lists/utils/searchPolicies';
  import { searchProfilesRpc } from '$lib/shared/data/circles/searchProfiles';

  interface Props {
    group: Address;
    onSelected?: (addresses: Address[]) => void | Promise<void>;
  }

  interface PickedAvatar {
    address: Address;
    avatarType?: string;
  }

  let { group, onSelected }: Props = $props();
  const searchController = createSearchOverlayController<SearchProfileResult>({
    search: searchProfiles,
    debounceMs: SEARCH_POLICY.REMOTE_DEBOUNCE_MS,
  });
  const { query, searchOpen, searching, error: searchError, result: searchResult } = searchController;
  let selected: PickedAvatar[] = $state([]);
  let searchInputEl: HTMLInputElement | null = $state(null);
  let overlayEl: HTMLDivElement | null = $state(null);
  let pickedListEl: HTMLDivElement | null = $state(null);

  const selectedSet = $derived(new Set(selected.map((a) => a.address.toLowerCase())));

  function asAddress(value: unknown): Address {
    return String(value).toLowerCase() as Address;
  }

  function avatarTypeToReadable(type?: string): string {
    if (type === 'CrcV2_RegisterHuman') return 'Human';
    if (type === 'CrcV2_RegisterOrganization') return 'Organization';
    if (type === 'CrcV2_RegisterGroup') return 'Group';
    return 'Unknown';
  }

  function onSearchInputFocus() {
    if ($query.trim().length > 0) {
      searchController.open();
    }
  }

  function closeSearchNow() {
    searchController.closeNow();
  }

  function focusSearchInput() {
    searchInputEl?.focus();
  }

  const searchListNavigator = createKeyboardListNavigator({
    getRows: () => Array.from(overlayEl?.querySelectorAll<HTMLElement>('[data-search-result-row]') ?? []),
    focusInput: focusSearchInput,
    onActivateRow: (row) => {
      const addr = row.dataset.searchResultAddress;
      if (!addr) return;
      addPicked(asAddress(addr), row.dataset.searchResultAvatarType);
    },
  });

  function onSearchResultRowClick(event: MouseEvent) {
    searchListNavigator.onRowClick(event);
  }

  const pickedListNavigator = createKeyboardListNavigator({
    getRows: () => Array.from(pickedListEl?.querySelectorAll<HTMLElement>('[data-picked-row]') ?? []),
    focusInput: focusSearchInput,
  });

  function onPickedRowClick(event: MouseEvent) {
    pickedListNavigator.onRowClick(event);
  }

  function onSearchInputArrowDown(event: KeyboardEvent) {
    if (event.key !== 'ArrowDown') return;

    const q = $query.trim();
    if (q.length > 0) {
      searchListNavigator.onInputArrowDown(event);
      return;
    }

    pickedListNavigator.onInputArrowDown(event);
  }

  $effect(() => {
    if (!$searchOpen) return;

    return registerOutsidePointerClose({
      isEnabled: () => $searchOpen,
      isInside: (target) => !!(searchInputEl?.contains(target) || overlayEl?.contains(target)),
      onOutside: closeSearchNow,
    });
  });

  async function searchProfiles(q: string) {
    const sdk = get(circles);
    if (!sdk?.circlesRpc) {
      return [];
    }

    return await searchProfilesRpc(sdk, {
      query: q,
      limit: SEARCH_POLICY.DEFAULT_REMOTE_LIMIT,
      offset: 0,
      avatarTypes: ['CrcV2_RegisterHuman', 'CrcV2_RegisterOrganization', 'CrcV2_RegisterGroup'],
    }) as SearchProfileResult[];
  }

  $effect(() => {
    searchController.onQueryChanged($query);
  });

  $effect(() => {
    return () => {
      searchController.dispose();
    };
  });

  function addPicked(address: Address, avatarType?: string) {
    const key = address.toLowerCase();
    if (selectedSet.has(key)) return;
    selected = [...selected, { address, avatarType }];
    searchController.clearAndClose();
    queueMicrotask(() => {
      focusSearchInput();
    });
  }

  function removePicked(address: Address) {
    selected = selected.filter((a) => a.address.toLowerCase() !== address.toLowerCase());
  }

  async function confirmAddAll() {
    if (selected.length === 0) return;

    const sdk = get(circles);
    if (!sdk) throw new Error('Circles SDK not available');

    const groupAvatar = await sdk.getAvatar(group);
    const selectedAddresses = selected.map((item) => item.address);
    await runTask({
      name: `${shortenAddress(group)} trusts ${selected.length} avatar${selected.length === 1 ? '' : 's'} ...`,
      promise: groupAvatar.trust(selectedAddresses),
    });

    await onSelected?.(selectedAddresses);
    popupControls.close();
  }
</script>

<FlowDecoration>
  <div class="space-y-3 relative">
    <p class="text-sm text-base-content/70">
      Search globally and collect multiple avatars. You can remove picks before confirming.
    </p>

    <div role="group" aria-label="Global avatar search">
      <ListShell
        query={query}
        searchPlaceholder="Search by name or address"
        bind:inputEl={searchInputEl}
        onInputKeydown={onSearchInputArrowDown}
        onInputFocus={onSearchInputFocus}
        wrapInListContainer={false}
      />
    </div>

    {#if $searchOpen}
      <div bind:this={overlayEl} class="absolute left-0 right-0 top-[64px] z-20 rounded-xl border border-base-300 bg-base-100 p-3 shadow-xl">
        <ListStates loading={$searching} error={$searchError}>
          {#if $query.trim() === ''}
            <div class="text-sm opacity-70">Type to search globally.</div>
          {:else if $searchResult.length === 0}
            <div class="text-sm opacity-70">No accounts found.</div>
          {:else}
            <div class="w-full flex flex-col gap-y-1.5" role="list">
              {#each $searchResult as profile (profile.address)}
                <div
                  tabindex={0}
                  role="button"
                  data-search-result-row
                  data-search-result-address={String(profile.address)}
                  data-search-result-avatar-type={profile.avatarType ?? ''}
                  onkeydown={searchListNavigator.onRowKeydown}
                  onclick={onSearchResultRowClick}
                  class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <RowFrame
                    clickable={true}
                    dense={true}
                    noLeading={true}
                    onclick={() => addPicked(asAddress(profile.address), profile.avatarType)}
                  >
                    <div class="min-w-0">
                      <Avatar
                        address={asAddress(profile.address)}
                        view="horizontal"
                        clickable={false}
                        bottomInfo={`${avatarTypeToReadable(profile.avatarType)} • ${profile.address}`}
                      />
                    </div>
                    {#snippet trailing()}
                      <div class="text-xs opacity-70">
                        {selectedSet.has(String(profile.address).toLowerCase()) ? 'Added' : 'Add'}
                      </div>
                    {/snippet}
                  </RowFrame>
                </div>
              {/each}
            </div>
          {/if}
        </ListStates>
      </div>
    {/if}

    <div class={$searchOpen ? 'opacity-20 pointer-events-none select-none' : ''}>
      <div class="text-sm opacity-70 mb-2">Picked avatars ({selected.length})</div>

      {#if selected.length === 0}
        <div class="text-sm opacity-70">No avatars picked yet.</div>
      {:else}
        <div bind:this={pickedListEl} class="w-full flex flex-col gap-y-1.5" role="list">
          {#each selected as picked (picked.address)}
            <div
              tabindex={0}
              role="button"
              data-picked-row
              onkeydown={pickedListNavigator.onRowKeydown}
              onclick={onPickedRowClick}
              aria-label={`Picked avatar ${picked.address}`}
              class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <RowFrame clickable={false} dense={true} noLeading={true}>
                <div class="min-w-0">
                  <Avatar
                    address={picked.address}
                    view="horizontal"
                    clickable={true}
                    bottomInfo={`${avatarTypeToReadable(picked.avatarType)} • ${picked.address}`}
                  />
                </div>
                {#snippet trailing()}
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs"
                    aria-label="Remove picked avatar"
                    onclick={() => removePicked(picked.address)}
                  >
                    <img src="/trash.svg" alt="" class="h-4 w-4" />
                  </button>
                {/snippet}
              </RowFrame>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="pt-2 flex justify-end">
      <ActionButton action={confirmAddAll} disabled={selected.length === 0}>
        Add {selected.length > 0 ? selected.length : ''} trusted avatar{selected.length === 1 ? '' : 's'}
      </ActionButton>
    </div>
  </div>
</FlowDecoration>
