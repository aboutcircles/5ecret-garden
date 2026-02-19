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

  async function ensureAuthed() {
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
      console.error('[sales] safe sign-in failed:', e);
      authed = false;
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
  headerTopGapClass="mt-4 md:mt-6"
  collapsedTopGapClass="mt-3 md:mt-4"
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
    <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">Sales</span>
  {/snippet}

  {#snippet collapsedMenu()}
    <ActionButtonDropDown {actions} />
  {/snippet}

  <section class="bg-base-100 border border-base-300 rounded-xl p-3 md:p-4">
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
