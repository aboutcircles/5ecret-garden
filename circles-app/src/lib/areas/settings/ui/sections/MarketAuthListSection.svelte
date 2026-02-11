<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import type { Readable } from 'svelte/store';
  import { derived, writable } from 'svelte/store';
  import ListShell from '$lib/shared/ui/common/ListShell.svelte';
  import GenericList from '$lib/shared/ui/common/GenericList.svelte';

  type ListValue = { data: any[]; next: () => Promise<boolean>; ended: boolean };
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
  let searchInputEl: HTMLInputElement | null = $state(null);
  const MARKET_LIST_SCOPE = '[data-market-orders-list-scope]';

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

  function onSearchInputKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown') return;
    const firstRow = document.querySelector<HTMLElement>(`${MARKET_LIST_SCOPE} [data-market-order-row]`);
    if (!firstRow) return;
    event.preventDefault();
    firstRow.focus();
  }

  $effect(() => {
    if (!searchInputEl) return;
    searchInputEl.setAttribute('data-market-auth-search-input', 'true');
    return () => {
      searchInputEl?.removeAttribute('data-market-auth-search-input');
    };
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
      bind:inputEl={searchInputEl}
      onInputKeydown={onSearchInputKeydown}
      isEmpty={storeDataLength === 0}
      isNoMatches={storeDataLength > 0 && filteredDataLength === 0}
      emptyLabel="No entries"
      noMatchesLabel="No matching entries"
      wrapInListContainer={false}
    >
      <div data-market-orders-list-scope>
        <GenericList store={filteredStore} {row} getKey={(it) => it.key} />
      </div>
    </ListShell>
  {/if}
</section>
