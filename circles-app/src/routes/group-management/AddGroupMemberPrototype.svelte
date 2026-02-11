<script lang="ts">
  import { get } from 'svelte/store';
  import type { Address } from '@circles-sdk/utils';
  import type { SearchProfileResult } from '$lib/domains/profile/model';
  import FlowDecoration from '$lib/shared/ui/flow/FlowDecoration.svelte';
  import ListToolbar from '$lib/shared/ui/common/ListToolbar.svelte';
  import ListStates from '$lib/shared/ui/common/ListStates.svelte';
  import RowFrame from '$lib/shared/ui/RowFrame.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import ActionButton from '$lib/shared/ui/common/ActionButton.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { popupControls } from '$lib/shared/state/popup';
  import { runTask } from '$lib/shared/utils/tasks';
  import { shortenAddress } from '$lib/shared/utils/shared';
  import { createKeyboardListNavigator } from '$lib/shared/utils/keyboardListNavigator';
  import { createSearchOverlayController } from '$lib/shared/utils/searchOverlayController';

  interface Props {
    group: Address;
    onSelected?: (addresses: Address[]) => void | Promise<void>;
  }

  let { group, onSelected }: Props = $props();
  const searchController = createSearchOverlayController<SearchProfileResult>({
    search: searchProfiles,
    debounceMs: 250,
  });
  const { query, searchOpen, searching, error: searchError, result: searchResult } = searchController;
  let selected: Address[] = $state([]);
  let searchInputEl: HTMLInputElement | null = $state(null);
  let overlayEl: HTMLDivElement | null = $state(null);

  const selectedSet = $derived(new Set(selected.map((a) => a.toLowerCase())));

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
      addPicked(asAddress(addr));
    },
  });

  function onSearchResultRowClick(event: MouseEvent) {
    searchListNavigator.onRowClick(event);
  }

  $effect(() => {
    if (!$searchOpen) return;

    function onWindowPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (searchInputEl?.contains(target) || overlayEl?.contains(target)) return;
      closeSearchNow();
    }

    window.addEventListener('pointerdown', onWindowPointerDown);
    return () => {
      window.removeEventListener('pointerdown', onWindowPointerDown);
    };
  });

  async function searchProfiles(q: string) {
    const sdk = get(circles);
    if (!sdk?.circlesRpc) {
      return [];
    }

    const raw = await sdk.circlesRpc.call<any>('circles_searchProfiles', [
      q,
      50,
      0,
      ['CrcV2_RegisterHuman', 'CrcV2_RegisterOrganization', 'CrcV2_RegisterGroup'],
    ]);
    return (Array.isArray(raw?.result) ? raw.result : []) as SearchProfileResult[];
  }

  $effect(() => {
    searchController.onQueryChanged($query);
  });

  $effect(() => {
    return () => {
      searchController.dispose();
    };
  });

  function addPicked(address: Address) {
    const key = address.toLowerCase();
    if (selectedSet.has(key)) return;
    selected = [...selected, address];
    searchController.clearAndClose();
    queueMicrotask(() => {
      focusSearchInput();
    });
  }

  function removePicked(address: Address) {
    selected = selected.filter((a) => a.toLowerCase() !== address.toLowerCase());
  }

  async function confirmAddAll() {
    if (selected.length === 0) return;

    const sdk = get(circles);
    if (!sdk) throw new Error('Circles SDK not available');

    const groupAvatar = await sdk.getAvatar(group);
    await runTask({
      name: `${shortenAddress(group)} trusts ${selected.length} avatar${selected.length === 1 ? '' : 's'} ...`,
      promise: groupAvatar.trust(selected),
    });

    await onSelected?.(selected);
    popupControls.close();
  }
</script>

<FlowDecoration>
  <div class="space-y-3 relative">
    <p class="text-sm text-base-content/70">
      Search globally and collect multiple avatars. You can remove picks before confirming.
    </p>

    <div role="group" aria-label="Global avatar search">
      <ListToolbar
        query={query}
        placeholder="Search by name or address"
        bind:inputEl={searchInputEl}
        onInputKeydown={searchListNavigator.onInputArrowDown}
        onInputFocus={onSearchInputFocus}
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
                  onkeydown={searchListNavigator.onRowKeydown}
                  onclick={onSearchResultRowClick}
                  class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <RowFrame
                    clickable={true}
                    dense={true}
                    noLeading={true}
                    onclick={() => addPicked(asAddress(profile.address))}
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
        <div class="w-full flex flex-col gap-y-1.5" role="list">
          {#each selected as address (address)}
            <RowFrame clickable={false} dense={true} noLeading={true}>
              <div class="min-w-0">
                <Avatar {address} view="horizontal" clickable={true} />
              </div>
              {#snippet trailing()}
                <button
                  type="button"
                  class="btn btn-ghost btn-xs"
                  aria-label="Remove picked avatar"
                  onclick={() => removePicked(address)}
                >
                  <img src="/trash.svg" alt="" class="h-4 w-4" />
                </button>
              {/snippet}
            </RowFrame>
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
