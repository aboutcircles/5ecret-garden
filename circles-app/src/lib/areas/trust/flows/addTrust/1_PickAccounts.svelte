<script lang="ts">
  import { get } from 'svelte/store';
  import type { Address } from '@aboutcircles/sdk-types';
  import type { SearchProfileResult } from '$lib/shared/model/profile';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepActionButtons from '$lib/shared/ui/flow/StepActionButtons.svelte';
  import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
  import ListStates from '$lib/shared/ui/lists/ListStates.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
  import { createSearchOverlayController } from '$lib/shared/ui/lists/utils/searchOverlayController';
  import { registerOutsidePointerClose } from '$lib/shared/ui/lists/utils/outsidePointerClose';
  import { SEARCH_POLICY } from '$lib/shared/ui/lists/utils/searchPolicies';
  import { searchProfilesRpc } from '$lib/shared/data/circles/searchProfiles';
  import { circles } from '$lib/shared/state/circles';
  import { isAddress } from '$lib/shared/utils/tx';
  import { openStep } from '$lib/shared/flow';
  import ConfirmTrust from './2_ConfirmTrust.svelte';
  import { ADD_TRUST_FLOW_SCAFFOLD_BASE } from './constants';
  import type { AddTrustFlowContext } from './context';

  interface Props {
    context: AddTrustFlowContext;
    onCompleted?: (addresses: Address[]) => void | Promise<void>;
  }

  interface PickedAvatar {
    address: Address;
    avatarType?: string;
  }

  let { context, onCompleted }: Props = $props();

  const searchController = createSearchOverlayController<SearchProfileResult>({
    search: searchProfiles,
    debounceMs: SEARCH_POLICY.REMOTE_DEBOUNCE_MS,
  });
  const { query, searchOpen, searching, error: searchError, result: searchResult } = searchController;

  let selected: PickedAvatar[] = $state([]);
  let searchInputEl: HTMLInputElement | null = $state(null);
  let overlayEl: HTMLDivElement | null = $state(null);
  let pickedListEl: HTMLDivElement | null = $state(null);

  let modeState = $state<'single' | 'batch'>('single');
  let modeInitialized = $state(false);
  const mode = $derived(modeState);
  let batchView = $state<'list' | 'bulk'>('list');
  let bulkInput = $state('');
  let bulkError = $state<string | null>(null);

  $effect(() => {
    if (modeInitialized) return;
    modeState = context.mode ?? 'single';
    modeInitialized = true;
  });

  $effect(() => {
    context.mode = modeState;
  });

  $effect(() => {
    if (selected.length > 0) return;
    if (!Array.isArray(context.selectedTrustees) || context.selectedTrustees.length === 0) return;
    selected = context.selectedTrustees.map((a) => ({ address: asAddress(a) }));
  });

  const isEmptySelection = $derived(selected.length === 0);
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
    if (mode !== 'single') return;
    const row = event.currentTarget as HTMLElement | null;
    const address = row?.dataset?.pickedAddress;
    if (!address) return;
    goNextWithSelected([{ address: asAddress(address) }]);
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
    if (!sdk?.rpc) {
      return [];
    }

    return (await searchProfilesRpc(sdk, {
      query: q,
      limit: SEARCH_POLICY.DEFAULT_REMOTE_LIMIT,
      offset: 0,
      avatarTypes: ['CrcV2_RegisterHuman', 'CrcV2_RegisterOrganization', 'CrcV2_RegisterGroup'],
    })) as SearchProfileResult[];
  }

  $effect(() => {
    searchController.onQueryChanged($query);
  });

  $effect(() => {
    return () => {
      searchController.dispose();
    };
  });

  function goNextWithSelected(nextSelected: PickedAvatar[]) {
    context.selectedTrustees = nextSelected.map((s) => s.address);
    openStep({
      title: 'Confirm trust',
      component: ConfirmTrust,
      props: { context, onCompleted },
      key: `add-trust:confirm:${context.actorType}:${context.actorAddress}`,
    });
  }

  function addPicked(address: Address, avatarType?: string) {
    const key = address.toLowerCase();
    if (selectedSet.has(key)) return;

    if (mode === 'single') {
      const next = [{ address, avatarType }];
      selected = next;
      searchController.clearAndClose();
      goNextWithSelected(next);
      return;
    }

    selected = [...selected, { address, avatarType }];
    searchController.clearAndClose();
    queueMicrotask(() => {
      focusSearchInput();
    });
  }

  function removePicked(address: Address) {
    selected = selected.filter((a) => a.address.toLowerCase() !== address.toLowerCase());
  }

  function parseBulkInput(input: string): Address[] {
    return input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => isAddress(line))
      .map((line) => asAddress(line));
  }

  function openBulkEditor() {
    batchView = 'bulk';
    bulkError = null;
    if (selected.length > 0) {
      bulkInput = selected.map((item) => item.address).join('\n');
    }
  }

  function closeBulkEditor() {
    batchView = 'list';
    bulkError = null;
  }

  function applyBulkInput() {
    bulkError = null;
    const parsed = parseBulkInput(bulkInput);
    if (parsed.length === 0) {
      bulkError = 'No valid addresses found.';
      return;
    }

    const next = new Map(selected.map((item) => [item.address.toLowerCase(), item]));
    for (const address of parsed) {
      const key = address.toLowerCase();
      if (!next.has(key)) {
        next.set(key, { address });
      }
    }

    selected = Array.from(next.values());
    bulkInput = '';
    closeBulkEditor();
  }

  function switchToBatch() {
    modeState = 'batch';
    context.mode = 'batch';
    batchView = 'list';
  }

  function goNext() {
    context.selectedTrustees = selected.map((s) => s.address);
    openStep({
      title: 'Confirm trust',
      component: ConfirmTrust,
      props: { context, onCompleted },
      key: `add-trust:confirm:${context.actorType}:${context.actorAddress}`,
    });
  }

</script>

<FlowStepScaffold {...ADD_TRUST_FLOW_SCAFFOLD_BASE} step={1} title="Add trust">
  <div class="space-y-3 relative">
    <p class="text-sm text-base-content/70">
      {#if mode === 'single'}
        Choose one account to trust.
      {:else}
        Pick several accounts to trust in one go.
      {/if}
    </p>

    {#if mode === 'batch' && batchView === 'bulk'}
      <div class="space-y-3">
        <textarea
          class="textarea textarea-bordered w-full min-h-40 font-mono"
          placeholder="One address per line"
          bind:value={bulkInput}
        ></textarea>

        {#if bulkError}
          <div class="text-sm text-error">{bulkError}</div>
        {/if}

        <div class="flex items-center justify-between">
          <button type="button" class="btn btn-ghost btn-sm" onclick={closeBulkEditor}>
            Back to list
          </button>
          <button type="button" class="btn btn-primary btn-sm" onclick={applyBulkInput}>
            Apply
          </button>
        </div>
      </div>
    {:else}
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
        <div
          bind:this={overlayEl}
          class="absolute left-0 right-0 top-[64px] z-20 rounded-xl border border-base-300 bg-base-100 p-3 shadow-xl"
        >
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

      {#if !isEmptySelection}
        <div class={$searchOpen ? 'opacity-20 pointer-events-none select-none' : ''}>
          <div class="text-sm opacity-70 mb-2">
            {#if mode === 'single'}
              Selected account
            {:else}
              Picked accounts ({selected.length})
            {/if}
          </div>

          <div bind:this={pickedListEl} class="w-full flex flex-col gap-y-1.5" role="list">
            {#each selected as picked (picked.address)}
              <div
                tabindex={0}
                role="button"
                data-picked-row
                data-picked-address={picked.address}
                onkeydown={pickedListNavigator.onRowKeydown}
                onclick={onPickedRowClick}
                aria-label={`Picked account ${picked.address}`}
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
                    {#if mode === 'batch'}
                      <button
                        type="button"
                        class="btn btn-ghost btn-xs"
                        aria-label="Remove picked account"
                        onclick={() => removePicked(picked.address)}
                      >
                        <img src="/trash.svg" alt="" class="h-4 w-4" />
                      </button>
                    {/if}
                  {/snippet}
                </RowFrame>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}

    <div class="flex items-center justify-between gap-2">
      {#if mode === 'single'}
        <button type="button" class="btn btn-ghost btn-sm" onclick={switchToBatch}>
          Add multiple…
        </button>
      {:else if batchView === 'list'}
        <button type="button" class="btn btn-ghost btn-sm" onclick={openBulkEditor}>
          Bulk import…
        </button>
      {/if}

      {#if !isEmptySelection}
        <StepActionButtons primaryLabel="Continue" onPrimary={goNext} />
      {/if}
    </div>
  </div>
</FlowStepScaffold>
