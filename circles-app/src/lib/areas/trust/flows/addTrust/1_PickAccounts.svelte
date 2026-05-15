<script lang="ts">
  import { get } from 'svelte/store';
  import type { Address } from '@circles-sdk/utils';
  import type { SearchProfileResult } from '$lib/shared/model/profile';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepActionButtons from '$lib/shared/ui/flow/StepActionButtons.svelte';
  import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
  import ListStates from '$lib/shared/ui/lists/ListStates.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { T } from '$lib/design-system/tokens.js';
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
  const queryIsAddress = $derived(isAddress($query.trim()));

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

  function activateSearchRow(row: HTMLElement | null) {
    const addr = row?.dataset?.searchResultAddress;
    if (!addr) return;
    addPicked(asAddress(addr), row?.dataset?.searchResultAvatarType);
  }

  const searchListNavigator = createKeyboardListNavigator({
    getRows: () => Array.from(overlayEl?.querySelectorAll<HTMLElement>('[data-search-result-row]') ?? []),
    focusInput: focusSearchInput,
    onActivateRow: (row) => activateSearchRow(row),
  });

  function onSearchResultRowClick(event: MouseEvent) {
    searchListNavigator.onRowClick(event);
    activateSearchRow(event.currentTarget as HTMLElement | null);
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
    if (!sdk?.circlesRpc) {
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
  <div style="display:flex;flex-direction:column;gap:12px;position:relative;">
    <p style="font-size:12.5px;color:{T.inkMuted};margin:0;">
      {#if mode === 'single'}
        Choose one account to trust.
      {:else}
        Pick several accounts to trust in one go.
      {/if}
    </p>

    {#if mode === 'batch' && batchView === 'bulk'}
      <!-- Bulk paste editor -->
      <div style="display:flex;flex-direction:column;gap:10px;">
        <textarea
          style="
            width:100%;min-height:120px;padding:10px 12px;
            border:1px solid {T.hairline};border-radius:10px;
            font-family:{T.fontMono};font-size:12px;color:{T.ink};background:{T.surfaceAlt};
            resize:vertical;box-sizing:border-box;
          "
          placeholder="One address per line"
          bind:value={bulkInput}
        ></textarea>

        {#if bulkError}
          <div style="font-size:12px;color:{T.negative};">{bulkError}</div>
        {/if}

        <div style="display:flex;align-items:center;justify-content:space-between;">
          <button
            type="button"
            style="height:36px;padding:0 14px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:13px;cursor:pointer;"
            onclick={closeBulkEditor}
          >Back to list</button>
          <button
            type="button"
            style="height:36px;padding:0 18px;border-radius:9999px;border:0;cursor:pointer;background:{T.primary};color:#fff;font-size:13px;font-weight:580;box-shadow:0 4px 12px rgba(88,73,212,0.25);"
            onclick={applyBulkInput}
          >Apply</button>
        </div>
      </div>
    {:else}
      <!-- Search input -->
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

      <!-- Search overlay -->
      {#if $searchOpen}
        <div
          bind:this={overlayEl}
          style="
            position:absolute;left:0;right:0;top:108px;z-index:20;
            border:1px solid {T.hairlineSoft};border-radius:14px;
            background:{T.surface};box-shadow:{T.shadow.md};
            padding:8px;
          "
        >
          <ListStates loading={$searching} error={$searchError}>
            {#if $query.trim() === ''}
              <div style="padding:10px 8px;font-size:12.5px;color:{T.inkMuted};">Type to search globally.</div>
            {:else if $searchResult.length === 0}
              <div style="padding:10px 8px;font-size:12.5px;color:{T.inkMuted};">No accounts found.</div>
            {:else}
              <div style="display:flex;flex-direction:column;gap:2px;" role="list">
                {#each $searchResult as profile (profile.address)}
                  {@const alreadyAdded = selectedSet.has(String(profile.address).toLowerCase())}
                  <div
                    tabindex={0}
                    role="button"
                    data-search-result-row
                    data-search-result-address={String(profile.address)}
                    data-search-result-avatar-type={profile.avatarType ?? ''}
                    onkeydown={searchListNavigator.onRowKeydown}
                    onclick={onSearchResultRowClick}
                    style="
                      padding:8px 10px;border-radius:10px;cursor:pointer;
                      display:flex;align-items:center;justify-content:space-between;gap:8px;
                      background:{alreadyAdded ? T.primaryFaint : 'transparent'};
                      transition:background .1s ease-out;
                    "
                  >
                    <div style="min-width:0;flex:1;">
                      <Avatar
                        address={asAddress(profile.address)}
                        view="horizontal"
                        clickable={false}
                        bottomInfo={`${avatarTypeToReadable(profile.avatarType)} · ${String(profile.address).slice(0,10)}…`}
                      />
                    </div>
                    <span style="font-size:11px;font-weight:540;color:{alreadyAdded ? T.primary : T.inkMuted};flex-shrink:0;">
                      {alreadyAdded ? 'Added' : 'Add'}
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          </ListStates>
        </div>
      {/if}

      <!-- Picked list -->
      {#if !isEmptySelection}
        <div style="{$searchOpen ? 'opacity:0.2;pointer-events:none;user-select:none;' : ''}display:flex;flex-direction:column;gap:6px;">
          <div style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;padding:0 2px;">
            {#if mode === 'single'}Selected account{:else}Picked ({selected.length}){/if}
          </div>

          <div bind:this={pickedListEl} style="display:flex;flex-direction:column;gap:4px;" role="list">
            {#each selected as picked (picked.address)}
              <div
                tabindex={0}
                role="button"
                data-picked-row
                data-picked-address={picked.address}
                onkeydown={pickedListNavigator.onRowKeydown}
                onclick={onPickedRowClick}
                aria-label={`Picked account ${picked.address}`}
                style="
                  padding:10px 12px;border-radius:12px;
                  background:{T.surface};border:1px solid {T.hairlineSoft};
                  display:flex;align-items:center;justify-content:space-between;gap:8px;
                  cursor:{mode === 'single' ? 'pointer' : 'default'};
                "
              >
                <div style="min-width:0;flex:1;">
                  <Avatar
                    address={picked.address}
                    view="horizontal"
                    clickable={false}
                    bottomInfo={`${avatarTypeToReadable(picked.avatarType)} · ${String(picked.address).slice(0,10)}…`}
                  />
                </div>
                {#if mode === 'batch'}
                  <button
                    type="button"
                    style="width:28px;height:28px;border-radius:9999px;border:0;background:{T.negativeSoft};color:{T.negative};display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;"
                    aria-label="Remove"
                    onclick={(e) => { e.stopPropagation(); removePicked(picked.address); }}
                  >
                    <img src="/trash.svg" alt="" style="width:13px;height:13px;" />
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}

    <!-- Bottom actions -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;">
      <div>
        {#if mode === 'single'}
          <button
            type="button"
            style="height:34px;padding:0 14px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:12.5px;cursor:pointer;"
            onclick={switchToBatch}
          >Add multiple…</button>
        {:else if batchView === 'list'}
          <button
            type="button"
            style="height:34px;padding:0 14px;border-radius:9999px;border:0;background:transparent;color:{T.inkMuted};font-size:12.5px;cursor:pointer;"
            onclick={openBulkEditor}
          >Bulk import…</button>
        {/if}
      </div>

      {#if !isEmptySelection}
        <StepActionButtons primaryLabel="Continue" onPrimary={goNext} />
      {:else if queryIsAddress && !$searchOpen}
        <StepActionButtons primaryLabel="Continue" onPrimary={() => addPicked(asAddress($query.trim()))} />
      {/if}
    </div>
  </div>
</FlowStepScaffold>
