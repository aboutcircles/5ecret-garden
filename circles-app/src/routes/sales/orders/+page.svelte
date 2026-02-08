<script lang="ts">
  import PageScaffold from '$lib/app/shell/PageScaffold.svelte';
  import GenericList from '$lib/components/GenericList.svelte';
  import { browser } from '$app/environment';
  import { getMarketClient } from '$lib/sdk/marketClient';
  import { onMount } from 'svelte';
  import type { Readable } from 'svelte/store';

  import ActionButtonBar from '$lib/app/shell/ActionButtonBar.svelte';
  import ActionButtonDropDown from '$lib/app/shell/ActionButtonDropDown.svelte';
  import type { Action } from '$lib/types/actions';
  import { RefreshCw as LRefreshCw } from 'lucide';

  import { signInWithSafe } from '$lib/auth/signin';
  import { avatarState } from '$lib/stores/avatar.svelte';

  import SalesOrderRow from './SalesOrderRow.svelte';

  type ListItem = {
    key: string;
    orderNumber: string;
    orderDate?: string;
    orderStatus?: string;
    paymentReference?: string | null;
  };

  // Auth state mirrored from market client
  let authed = $state(false);
  const pageSize = 20;

  function mapItems(items: any[]): ListItem[] {
    return (items ?? []).map((o: any) => ({
      key: String(o?.orderNumber ?? ''),
      orderNumber: String(o?.orderNumber ?? ''),
      orderDate: typeof o?.orderDate === 'string' ? o.orderDate : undefined,
      orderStatus: typeof o?.orderStatus === 'string' ? o.orderStatus : undefined,
      paymentReference: (o?.paymentReference ?? null) as string | null,
    }));
  }

  function buildAuthedStore(): Readable<{ data: ListItem[]; next: () => Promise<boolean>; ended: boolean }>{
    type State = { data: ListItem[]; ended: boolean; next: () => Promise<boolean>; page: number; loading: boolean };
    const subscribers = new Set<(v: State) => void>();
    const notify = (v: State) => subscribers.forEach((fn) => fn(v));

    let state: State = {
      data: [],
      ended: false,
      page: 0,
      loading: false,
      next: async () => {
        if (state.loading || state.ended) return true;
        state = { ...state, loading: true };
        notify(state);
        try {
          const nextPage = state.page + 1;
          const res = await getMarketClient().sales.list({ page: nextPage, pageSize });
          const items = Array.isArray(res?.items) ? res.items : [];
          const data = state.data.concat(mapItems(items));
          const ended = items.length < pageSize;
          state = { ...state, data, page: nextPage, ended, loading: false };
          notify(state);
          return ended;
        } catch (e) {
          state = { ...state, ended: true, loading: false };
          notify(state);
          return true;
        }
      },
    };

    return {
      subscribe(run: (v: State) => void) {
        subscribers.add(run);
        run(state);
        return () => { subscribers.delete(run); };
      },
    } as any;
  }

  function buildFallbackStore(): Readable<{ data: ListItem[]; next: () => Promise<boolean>; ended: boolean }>{
    type State = { data: ListItem[]; ended: boolean; next: () => Promise<boolean> };
    const subscribers = new Set<(v: State) => void>();
    let state: State = {
      data: [],
      ended: true,
      next: async () => true,
    };
    return {
      subscribe(run: (v: State) => void) {
        subscribers.add(run);
        run(state);
        return () => { subscribers.delete(run); };
      },
    } as any;
  }

  let store = $derived<Readable<{ data: ListItem[]; next: () => Promise<boolean>; ended: boolean }>>(
    browser
      ? (authed ? buildAuthedStore() : buildFallbackStore())
      : ({ subscribe(run: any) { run({ data: [], next: async () => true, ended: true }); return () => {}; } } as any)
  );

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
    <GenericList
      {store}
      row={SalesOrderRow}
      getKey={(it) => it.key}
      rowHeight={64}
      expectedPageSize={pageSize}
      maxPlaceholderPages={1}
    />
  </section>
</PageScaffold>
