<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import type { Readable } from 'svelte/store';
  import { derived, writable } from 'svelte/store';
  import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
  import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
  import MarketOrderRowPlaceholder from '$lib/shared/ui/lists/placeholders/MarketOrderRowPlaceholder.svelte';
  import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';

  type ListValue = { data: any[]; next: () => Promise<boolean>; ended: boolean; error?: string | null };
  type ListStore = Readable<ListValue>;

  type Props = {
    title: string;
    description: string;
    avatarAddress: Address | '';
    authed: boolean;
    ensureAuthed: () => Promise<void>;
    store: ListStore;
    row: any;
    connectMessage: string;
    signInMessage: string;
    signInLabel?: string;
  };

  let {
    title,
    description,
    avatarAddress,
    authed,
    ensureAuthed,
    store,
    row,
    connectMessage,
    signInMessage,
    signInLabel = 'Sign in'
  }: Props = $props();

  const query = writable('');
  let marketListScopeEl: HTMLDivElement | null = $state(null);

  const filteredStore = derived([store, query], ([$store, $query]) => {
    const q = ($query ?? '').toLowerCase().trim();
    if (!q) return $store;

    const data = ($store?.data ?? []).filter((it: any) => {
      const key = String(it?.key ?? '').toLowerCase();
      const orderNumber = String(it?.orderNumber ?? '').toLowerCase();
      const displayId = String(it?.displayId ?? '').toLowerCase();
      return key.includes(q) || orderNumber.includes(q) || displayId.includes(q);
    });

    return {
      ...$store,
      data,
    };
  });

  const storeDataLength = $derived(($store?.data ?? []).length);
  const filteredDataLength = $derived(($filteredStore?.data ?? []).length);

  const onSearchInputKeydown = createListInputArrowDownHandler({
    getScope: () => marketListScopeEl,
    rowSelector: '[data-market-order-row]'
  });
</script>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-sm font-semibold m-0">{title}</h3>
      <p class="text-xs text-base-content/70 mt-0.5">{description}</p>
    </div>
    {#if avatarAddress && !authed}
      <button class="btn btn-primary btn-sm" onclick={() => ensureAuthed()}>
        {signInLabel}
      </button>
    {/if}
  </div>
</section>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  {#if !avatarAddress}
    <div class="text-sm opacity-70">{connectMessage}</div>
  {:else if !authed}
    <div class="text-sm opacity-70">{signInMessage}</div>
  {:else}
    <ListShell
      query={query}
      searchPlaceholder="Search by order id"
      inputDataAttribute="data-market-auth-search-input"
      onInputKeydown={onSearchInputKeydown}
      isEmpty={storeDataLength === 0}
      ended={$store?.ended ?? false}
      emptyRequiresEnd={true}
      isNoMatches={storeDataLength > 0 && filteredDataLength === 0}
      emptyLabel="No entries"
      noMatchesLabel="No matching entries"
      wrapInListContainer={false}
    >
      <div data-market-orders-list-scope bind:this={marketListScopeEl}>
        <GenericList
          store={filteredStore}
          {row}
          getKey={(it) => it.key}
          rowHeight={64}
          expectedPageSize={25}
          maxPlaceholderPages={2}
          placeholderRow={MarketOrderRowPlaceholder}
        />
      </div>
    </ListShell>
  {/if}
</section>
