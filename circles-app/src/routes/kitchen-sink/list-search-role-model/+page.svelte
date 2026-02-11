<script lang="ts">
  import { writable } from 'svelte/store';
  import type { Address } from '@circles-sdk/utils';
  import ListToolbar from '$lib/shared/ui/common/ListToolbar.svelte';
  import ListStates from '$lib/shared/ui/common/ListStates.svelte';
  import RowFrame from '$lib/shared/ui/RowFrame.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { createSearchablePaginatedList } from '$lib/shared/state/searchablePaginatedList';
  import { createKeyboardListNavigator } from '$lib/shared/utils/keyboardListNavigator';
  import { createSearchOverlayController } from '$lib/shared/utils/searchOverlayController';

  type AvatarType = 'CrcV2_RegisterHuman' | 'CrcV2_RegisterOrganization' | 'CrcV2_RegisterGroup';
  interface DemoAvatar {
    address: Address;
    avatarType: AvatarType;
    name: string;
  }

  const seed: DemoAvatar[] = [
    { address: '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113' as Address, avatarType: 'CrcV2_RegisterHuman', name: 'Alice' },
    { address: '0x6c8757f5f8f5cfdf2f4f4df4d7b0f6f3c9a2f160' as Address, avatarType: 'CrcV2_RegisterOrganization', name: 'Bread Coop' },
    { address: '0x9f7b1f789a7248f7c6b74f9f6b9a4d3f2f4d0b11' as Address, avatarType: 'CrcV2_RegisterGroup', name: 'Neighborhood Group' },
    { address: '0x2f5d12ad7f9b5f6e8a7c4d2b1a9e0c3f7d6a5b44' as Address, avatarType: 'CrcV2_RegisterHuman', name: 'Bruno' },
    { address: '0x8c4b8f2f9a3e7c2b5d1f9e8a6b3c5d7f1a2b3c44' as Address, avatarType: 'CrcV2_RegisterOrganization', name: 'Solar Workshop' },
  ];

  function avatarTypeToReadable(type?: string): string {
    if (type === 'CrcV2_RegisterHuman') return 'Human';
    if (type === 'CrcV2_RegisterOrganization') return 'Organization';
    if (type === 'CrcV2_RegisterGroup') return 'Group';
    return 'Unknown';
  }

  // --- Base trusted-list pattern (search + checkbox rows + keyboard) ---
  const trustedStore = writable<DemoAvatar[]>(seed);
  const trustedSearch = createSearchablePaginatedList(trustedStore, {
    pageSize: 50,
    addressOf: (item) => item.address,
  });
  const { searchQuery: trustedQuery, filteredItems: trustedFiltered } = trustedSearch;

  let trustedInputEl: HTMLInputElement | null = $state(null);
  let trustedListEl: HTMLDivElement | null = $state(null);
  let trustedSelectedSet: Set<string> = $state(new Set());

  function focusTrustedInput() {
    trustedInputEl?.focus();
  }

  function toggleTrusted(address: Address, checked: boolean) {
    const next = new Set(trustedSelectedSet);
    if (checked) next.add(address.toLowerCase());
    else next.delete(address.toLowerCase());
    trustedSelectedSet = next;
  }

  const trustedNavigator = createKeyboardListNavigator({
    getRows: () => Array.from(trustedListEl?.querySelectorAll<HTMLElement>('[data-trusted-row]') ?? []),
    focusInput: focusTrustedInput,
    onActivateRow: (row) => {
      const address = String(row.dataset.address ?? '').toLowerCase() as Address;
      if (!address) return;
      toggleTrusted(address, !trustedSelectedSet.has(address));
    },
  });

  // --- Add-flow pattern (overlay + picked list + keyboard fallback) ---
  const addController = createSearchOverlayController<DemoAvatar>({
    debounceMs: 120,
    search: async (q) => {
      await new Promise((resolve) => setTimeout(resolve, 120));
      const needle = q.trim().toLowerCase();
      if (!needle) return [];
      return seed.filter((item) => {
        const label = `${item.name} ${item.address} ${avatarTypeToReadable(item.avatarType)}`.toLowerCase();
        return label.includes(needle);
      });
    },
  });

  const { query: addQuery, searchOpen, searching, error: searchError, result: searchResult } = addController;

  let addInputEl: HTMLInputElement | null = $state(null);
  let overlayEl: HTMLDivElement | null = $state(null);
  let pickedListEl: HTMLDivElement | null = $state(null);
  let picked: DemoAvatar[] = $state([]);
  const pickedSet = $derived(new Set(picked.map((p) => p.address.toLowerCase())));

  function focusAddInput() {
    addInputEl?.focus();
  }

  const overlayNavigator = createKeyboardListNavigator({
    getRows: () => Array.from(overlayEl?.querySelectorAll<HTMLElement>('[data-overlay-row]') ?? []),
    focusInput: focusAddInput,
    onActivateRow: (row) => {
      const address = String(row.dataset.address ?? '').toLowerCase() as Address;
      const avatarType = row.dataset.avatarType as AvatarType | undefined;
      const name = row.dataset.name ?? '';
      if (!address) return;
      addPicked({ address, avatarType: avatarType ?? 'CrcV2_RegisterHuman', name });
    },
  });

  const pickedNavigator = createKeyboardListNavigator({
    getRows: () => Array.from(pickedListEl?.querySelectorAll<HTMLElement>('[data-picked-row]') ?? []),
    focusInput: focusAddInput,
  });

  function onAddInputFocus() {
    if ($addQuery.trim().length > 0) addController.open();
  }

  function onAddInputArrowDown(event: KeyboardEvent) {
    if (event.key !== 'ArrowDown') return;
    if ($addQuery.trim().length > 0) {
      overlayNavigator.onInputArrowDown(event);
      return;
    }
    pickedNavigator.onInputArrowDown(event);
  }

  function addPicked(item: DemoAvatar) {
    const key = item.address.toLowerCase();
    if (pickedSet.has(key)) return;
    picked = [...picked, item];
    addController.clearAndClose();
    queueMicrotask(focusAddInput);
  }

  function removePicked(address: Address) {
    picked = picked.filter((p) => p.address.toLowerCase() !== address.toLowerCase());
  }

  $effect(() => {
    addController.onQueryChanged($addQuery);
  });

  $effect(() => {
    if (!$searchOpen) return;
    function onWindowPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (addInputEl?.contains(target) || overlayEl?.contains(target)) return;
      addController.closeNow();
    }
    window.addEventListener('pointerdown', onWindowPointerDown);
    return () => window.removeEventListener('pointerdown', onWindowPointerDown);
  });

  $effect(() => {
    return () => addController.dispose();
  });
</script>

<section class="rounded-xl border border-base-300 bg-base-100 p-4 space-y-4">
  <h2 class="text-lg font-semibold">List/Search Role Model</h2>
  <p class="text-sm opacity-75">
    Demonstrates the converged interaction model used in group-management: input↔list keyboard flow,
    focusable row wrappers, metadata-rich identity rows, and overlay add-flow with picked list fallback.
  </p>

  <div class="grid gap-4 lg:grid-cols-2">
    <section class="rounded-xl border border-base-300 p-3">
      <h3 class="font-medium mb-2">Trusted avatars list pattern</h3>
      <ListToolbar
        query={trustedQuery}
        placeholder="Search by name or address"
        bind:inputEl={trustedInputEl}
        onInputKeydown={trustedNavigator.onInputArrowDown}
      />

      <ListStates
        loading={false}
        error={null}
        isEmpty={seed.length === 0}
        isNoMatches={seed.length > 0 && $trustedFiltered.length === 0}
        emptyLabel="No trusted avatars"
        noMatchesLabel="No matches"
      >
        <div bind:this={trustedListEl} class="w-full flex flex-col gap-y-1.5" role="list">
          {#each $trustedFiltered as item (item.address)}
            <div
              tabindex={0}
              role="button"
              data-trusted-row
              data-address={item.address}
              onkeydown={trustedNavigator.onRowKeydown}
              onclick={trustedNavigator.onRowClick}
              aria-pressed={trustedSelectedSet.has(item.address.toLowerCase()) ? 'true' : 'false'}
              class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <RowFrame clickable={false} dense={true} noLeading={true}>
                <div class="min-w-0">
                  <Avatar
                    address={item.address}
                    view="horizontal"
                    clickable={true}
                    bottomInfo={`${avatarTypeToReadable(item.avatarType)} • ${item.address}`}
                  />
                </div>
                {#snippet trailing()}
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    checked={trustedSelectedSet.has(item.address.toLowerCase())}
                    onchange={(e) => toggleTrusted(item.address, (e.currentTarget as HTMLInputElement).checked)}
                  />
                {/snippet}
              </RowFrame>
            </div>
          {/each}
        </div>
      </ListStates>
    </section>

    <section class="rounded-xl border border-base-300 p-3 relative">
      <h3 class="font-medium mb-2">Add-flow pattern (overlay + picked)</h3>
      <ListToolbar
        query={addQuery}
        placeholder="Search by name or address"
        bind:inputEl={addInputEl}
        onInputKeydown={onAddInputArrowDown}
        onInputFocus={onAddInputFocus}
      />

      {#if $searchOpen}
        <div bind:this={overlayEl} class="absolute left-3 right-3 top-[92px] z-20 rounded-xl border border-base-300 bg-base-100 p-3 shadow-xl">
          <ListStates loading={$searching} error={$searchError}>
            {#if $addQuery.trim() === ''}
              <div class="text-sm opacity-70">Type to search globally.</div>
            {:else if $searchResult.length === 0}
              <div class="text-sm opacity-70">No accounts found.</div>
            {:else}
              <div class="w-full flex flex-col gap-y-1.5" role="list">
                {#each $searchResult as item (item.address)}
                  <div
                    tabindex={0}
                    role="button"
                    data-overlay-row
                    data-address={item.address}
                    data-avatar-type={item.avatarType}
                    data-name={item.name}
                    onkeydown={overlayNavigator.onRowKeydown}
                    onclick={overlayNavigator.onRowClick}
                    class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <RowFrame clickable={true} dense={true} noLeading={true} onclick={() => addPicked(item)}>
                      <div class="min-w-0">
                        <Avatar
                          address={item.address}
                          view="horizontal"
                          clickable={false}
                          bottomInfo={`${avatarTypeToReadable(item.avatarType)} • ${item.address}`}
                        />
                      </div>
                      {#snippet trailing()}
                        <div class="text-xs opacity-70">{pickedSet.has(item.address.toLowerCase()) ? 'Added' : 'Add'}</div>
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
        <div class="text-sm opacity-70 mb-2">Picked avatars ({picked.length})</div>
        {#if picked.length === 0}
          <div class="text-sm opacity-70">No avatars picked yet.</div>
        {:else}
          <div bind:this={pickedListEl} class="w-full flex flex-col gap-y-1.5" role="list">
            {#each picked as item (item.address)}
              <div
                tabindex={0}
                role="button"
                data-picked-row
                onkeydown={pickedNavigator.onRowKeydown}
                onclick={pickedNavigator.onRowClick}
                class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <RowFrame clickable={false} dense={true} noLeading={true}>
                  <div class="min-w-0">
                    <Avatar
                      address={item.address}
                      view="horizontal"
                      clickable={true}
                      bottomInfo={`${avatarTypeToReadable(item.avatarType)} • ${item.address}`}
                    />
                  </div>
                  {#snippet trailing()}
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs"
                      aria-label="Remove picked avatar"
                      onclick={() => removePicked(item.address)}
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
    </section>
  </div>
</section>
