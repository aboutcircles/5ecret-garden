<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import type { Readable } from 'svelte/store';
  import { derived, writable } from 'svelte/store';
  import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
  import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
  import MarketOrderRowPlaceholder from '$lib/shared/ui/lists/placeholders/MarketOrderRowPlaceholder.svelte';
  import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';
  import { T } from '$lib/design-system/tokens.js';

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

  const buildFilteredStore = () =>
    derived([store, query], ([$store, $query]) => {
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

  let filteredStore = $state<ListStore>(buildFilteredStore());

  $effect(() => {
    filteredStore = buildFilteredStore();
  });

  const storeDataLength = $derived(($store?.data ?? []).length);
  const filteredDataLength = $derived(($filteredStore?.data ?? []).length);

  const onSearchInputKeydown = createListInputArrowDownHandler({
    getScope: () => marketListScopeEl,
    rowSelector: '[data-market-order-row]'
  });
</script>

<section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
  <div style="min-width:0;">
    <h3 style="font-family:{T.fontSans};font-size:13px;font-weight:580;color:{T.ink};margin:0;">{title}</h3>
    <p style="font-size:11.5px;color:{T.inkMuted};margin:2px 0 0 0;line-height:1.5;">{description}</p>
  </div>
  {#if avatarAddress && !authed}
    <button
      type="button"
      style="height:34px;padding:0 14px;border-radius:9999px;border:0;cursor:pointer;background:{T.primary};color:#fff;font-size:12.5px;font-weight:580;box-shadow:0 4px 12px rgba(88,73,212,0.25);"
      onclick={() => ensureAuthed()}
    >{signInLabel}</button>
  {/if}
</section>

<section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;">
  {#if !avatarAddress}
    <div style="font-size:12.5px;color:{T.inkMuted};">{connectMessage}</div>
  {:else if !authed}
    <div style="font-size:12.5px;color:{T.inkMuted};">{signInMessage}</div>
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
