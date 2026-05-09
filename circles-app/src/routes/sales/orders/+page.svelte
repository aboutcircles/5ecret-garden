<script lang="ts">
  import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
  import { derived, readable, writable } from 'svelte/store';
  import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
  import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
  import { browser } from '$app/environment';
  import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
  import { onMount } from 'svelte';
  import type { PaginatedReadable } from '$lib/shared/state/paginatedList';

  import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
  import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
  import type { Action } from '$lib/shared/ui/shell/actions';
  import { RefreshCw as LRefreshCw } from 'lucide';

  import { signInWithSafe } from '$lib/areas/market/auth/signin';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';
  import {
    getSalesBySeller,
  } from '$lib/areas/market/orders/ordersQueries';
  import {
    mapMarketSales,
    type MarketSalesListItem,
  } from '$lib/areas/market/orders/ordersMappers';
  import {
    createPagedListStore,
  } from '$lib/areas/market/orders/ordersStores';

  import SalesOrderRow from '$lib/areas/market/ui/SalesOrderRow.svelte';
  import MarketOrderRowPlaceholder from '$lib/shared/ui/lists/placeholders/MarketOrderRowPlaceholder.svelte';

  type ListItem = MarketSalesListItem;

  // Auth state mirrored from market client
  let authed = $state(false);
  const pageSize = 20;
  const query = writable('');
  let salesListScopeEl: HTMLDivElement | null = $state(null);

  function createStaticListStore<T>(data: T[] = []): PaginatedReadable<T> {
    return readable({ data, next: async () => true, ended: true });
  }

  function buildAuthedStore(): PaginatedReadable<ListItem> {
    return createPagedListStore<ListItem>({
      pageSize,
      loadPage: async (page, currentPageSize) => {
        const res = await getSalesBySeller(page, currentPageSize);
        const items = Array.isArray(res?.items) ? res.items : [];
        return mapMarketSales(items);
      },
      isEnded: (items, currentPageSize) => items.length < currentPageSize,
    });
  }

  function buildFallbackStore(): PaginatedReadable<ListItem> {
    return createStaticListStore<ListItem>();
  }

  let store = $derived<PaginatedReadable<ListItem>>(
    browser
      ? (authed ? buildAuthedStore() : buildFallbackStore())
      : buildFallbackStore()
  );

  const filteredStore = derived([store, query], ([$store, $query]) => {
    const q = ($query ?? '').toLowerCase().trim();
    if (!q) return $store;
    const data = ($store?.data ?? []).filter((it) => {
      const orderNumber = String(it?.orderNumber ?? '').toLowerCase();
      const paymentRef = String(it?.paymentReference ?? '').toLowerCase();
      return orderNumber.includes(q) || paymentRef.includes(q);
    });
    return {
      ...$store,
      data,
    };
  });

  const storeDataLength = $derived(($store?.data ?? []).length);
  const filteredDataLength = $derived(($filteredStore?.data ?? []).length);

  const onSearchInputKeydown = createListInputArrowDownHandler({
    getScope: () => salesListScopeEl,
    rowSelector: '[data-market-order-row]'
  });

  let signInError: string | null = $state(null);
  let signInPending: boolean = $state(false);

  async function ensureAuthed() {
    signInPending = true;
    signInError = null;
    try {
      const avatar = (
        (avatarState.avatar as any)?.address ??
        (avatarState.avatar as any)?.avatarInfo?.avatar ??
        ''
      ).toLowerCase();

      if (!avatar || !/^0x[a-f0-9]{40}$/.test(avatar)) {
        throw new Error('No Circles avatar address available for Safe login');
      }

      await signInWithSafe(avatar);
      authed = !!getMarketClient().auth.getAuthMeta();
    } catch (e) {
      signInError = e instanceof Error ? e.message : String(e);
      authed = false;
    } finally {
      signInPending = false;
    }
  }

  const actions: Action[] = $derived([
    {
      id: 'signin',
      label: authed ? 'Signed in' : 'Sign in to view sales',
      variant: authed ? 'ghost' : 'primary',
      onClick: () => { if (!authed) void ensureAuthed(); },
      disabled: false,
    },
    {
      id: 'refresh',
      label: 'Refresh',
      iconNode: LRefreshCw,
      variant: 'ghost',
      disabled: !authed,
      onClick: () => { /* re-instantiating store triggers reload via $derived */ authed = !!getMarketClient().auth.getAuthMeta(); },
    },
  ]);

  onMount(() => {
    if (browser) {
      authed = !!getMarketClient().auth.getAuthMeta();
    }
  });
</script>

<PageScaffold
  highlight="soft"
  collapsedMode="bar"
  collapsedHeightClass="h-12"
  maxWidthClass="page page--lg"
  contentWidthClass="page page--lg"
  usePagePadding={true}
>
  {#snippet title()}
    <h1 class="h2 m-0">Sales</h1>
  {/snippet}

  {#snippet meta()}
    Orders you received as a seller
  {/snippet}

  {#snippet headerActions()}
    <ActionButtonBar {actions} />
  {/snippet}

  {#snippet collapsedLeft()}
    <span style="font-size:1rem;font-weight:600;letter-spacing:-0.015em;color:#0F0A1E;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Sales</span>
  {/snippet}

  {#snippet collapsedMenu()}
    <ActionButtonDropDown {actions} />
  {/snippet}

  {#if signInError}
    <section style="background:#FFFFFF;border:1px solid rgba(196,68,48,0.2);border-radius:12px;padding:14px 16px;margin-bottom:12px;display:flex;flex-direction:column;gap:10px;align-items:flex-start;">
      <div style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:13.5px;font-weight:580;color:#0F0A1E;">Couldn't sign in</span>
        <span style="font-size:12px;color:rgba(15,10,30,0.62);">{signInError}</span>
      </div>
      <button type="button" disabled={signInPending} onclick={() => void ensureAuthed()} style="height:32px;padding:0 14px;border-radius:9999px;border:1px solid rgba(15,10,30,0.12);background:#FFFFFF;color:#0F0A1E;font-size:12.5px;font-weight:540;cursor:{signInPending ? 'not-allowed' : 'pointer'};opacity:{signInPending ? 0.6 : 1};">{signInPending ? 'Signing in…' : 'Retry sign-in'}</button>
    </section>
  {/if}

  <section style="background:#FFFFFF;border:1px solid rgba(31,17,70,0.05);border-radius:12px;padding:12px;">
    <ListShell
      query={query}
      searchPlaceholder="Search by order id or payment reference"
      inputDataAttribute="data-market-auth-search-input"
      onInputKeydown={onSearchInputKeydown}
      isEmpty={storeDataLength === 0}
      ended={$store?.ended ?? false}
      emptyRequiresEnd={true}
      isNoMatches={storeDataLength > 0 && filteredDataLength === 0}
      emptyLabel="No sales orders"
      noMatchesLabel="No matching sales orders"
      wrapInListContainer={false}
    >
      <div data-sales-orders-list-scope bind:this={salesListScopeEl}>
        <GenericList
          store={filteredStore}
          row={SalesOrderRow}
          getKey={(it) => it.key}
          rowHeight={64}
          expectedPageSize={pageSize}
          maxPlaceholderPages={2}
          placeholderRow={MarketOrderRowPlaceholder}
        />
      </div>
    </ListShell>
  </section>
</PageScaffold>
