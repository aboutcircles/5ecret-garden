<script lang="ts">
  import { ethers } from 'ethers';
  import { writable, type Readable } from 'svelte/store';

  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
  import ActionButtonBar from '$lib/components/layout/ActionButtonBar.svelte';
  import ActionButtonDropDown from '$lib/components/layout/ActionButtonDropDown.svelte';
  import type { Action } from '$lib/components/layout/Action';
  import GenericList from '$lib/components/GenericList.svelte';

  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import { shortenAddress } from '$lib/utils/shared';
  import type { Address } from '@circles-sdk/utils';
  import { popupControls } from '$lib/stores/popUp';

  import GatewayRowView from './GatewayRow.svelte';
  import type { GatewayRow } from './types';
  import CreateGatewayProfile from '$lib/flows/paymentGateway/CreateGatewayProfile.svelte';

  type GatewayListStore = {
    data: GatewayRow[];
    next: () => Promise<boolean>;
    ended: boolean;
  };

  const myGatewaysStoreInner = writable<GatewayListStore>({
    data: [],
    next: async () => true,
    ended: true
  });

  const myGatewaysStore: Readable<GatewayListStore> = {
    subscribe: myGatewaysStoreInner.subscribe
  };

  let loadingGateways: boolean = $state(false);

  const ownerAddress = $derived(
    (avatarState.avatar?.address ?? '') as Address | ''
  );

  const shortAddr = (a?: string) => (a ? shortenAddress(a as any) : '');

  async function loadMyGateways(): Promise<void> {
    if (!ownerAddress || !$circles?.circlesRpc) {
      myGatewaysStoreInner.set({
        data: [],
        next: async () => true,
        ended: true
      });
      return;
    }

    try {
      loadingGateways = true;

      const resp = await $circles.circlesRpc.call<{
        columns: string[];
        rows: any[][];
      }>('circles_query', [
        {
          Namespace: 'CrcV2_PaymentGateway',
          Table: 'GatewayCreated',
          Columns: ['gateway', 'timestamp', 'transactionHash', 'blockNumber'],
          Filter: [
            {
              Type: 'FilterPredicate',
              FilterType: 'Equals',
              Column: 'owner',
              Value: ownerAddress.toLowerCase()
            }
          ],
          Order: []
        }
      ]);

      const cols = resp?.result?.columns ?? [];
      const rows = resp?.result?.rows ?? [];

      const idxG = cols.indexOf('gateway');
      const idxTs = cols.indexOf('timestamp');
      const idxTx = cols.indexOf('transactionHash');
      const idxBn = cols.indexOf('blockNumber');

      const rowsMapped: GatewayRow[] = rows
        .map((r) => {
          const gateway = r[idxG] ? ethers.getAddress(r[idxG]) : '';
          if (!gateway) return null;
          return {
            gateway,
            timestamp: r[idxTs] ? Number(r[idxTs]) : undefined,
            tx: r[idxTx] ?? undefined,
            blockNumber: r[idxBn] ? Number(r[idxBn]) : 0,
            transactionIndex: 0,
            logIndex: 0
          } as GatewayRow;
        })
        .filter((r): r is GatewayRow => r !== null)
        .sort((a, b) => b.blockNumber - a.blockNumber);

      myGatewaysStoreInner.set({
        data: rowsMapped,
        next: async () => true,
        ended: true
      });
    } catch (e) {
      console.error('loadMyGateways', e);
      myGatewaysStoreInner.set({
        data: [],
        next: async () => true,
        ended: true
      });
    } finally {
      loadingGateways = false;
    }
  }

  // Load when we have an owner + circles RPC
  $effect(() => {
    if (ownerAddress && $circles?.circlesRpc) {
      loadMyGateways();
    } else {
      myGatewaysStoreInner.set({
        data: [],
        next: async () => true,
        ended: true
      });
    }
  });

  function openCreateGatewayFlow() {
    popupControls.open({
      title: 'Create payment gateway',
      component: CreateGatewayProfile,
      props: {
        onCreated: async () => {
          // Reload list after a gateway has been created
          await loadMyGateways();
        }
      }
    });
  }

  const actions: Action[] = [
    {
      id: 'create',
      label: 'Create gateway',
      variant: 'primary',
      onClick: openCreateGatewayFlow
    }
  ];
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
  <svelte:fragment slot="title">
    <h1 class="h2 m-0">Payment gateways</h1>
  </svelte:fragment>

  <svelte:fragment slot="meta">
    {#if ownerAddress}
      Owner {shortAddr(ownerAddress)}
    {:else}
      Connect wallet to manage gateways
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="actions">
    <ActionButtonBar {actions} />
  </svelte:fragment>

  <svelte:fragment slot="collapsed-left">
    <span
      class="text-base md:text-lg font-semibold tracking-tight text-base-content"
      >Payment gateways</span
    >
  </svelte:fragment>

  <svelte:fragment slot="collapsed-menu">
    <ActionButtonDropDown {actions} />
  </svelte:fragment>

  <section class="bg-base-100 border border-base-300 rounded-xl p-4">
    <div class="flex items-center justify-between mb-3">
      <div class="text-sm"><strong>My Gateways</strong></div>
    </div>

    {#if !ownerAddress}
      <div class="text-sm opacity-70">
        Connect a Circles avatar to see your payment gateways.
      </div>
    {:else if !$circles}
      <div class="text-sm opacity-70">
        Connect Circles to load your gateways.
      </div>
    {:else if loadingGateways}
      <div class="loading loading-spinner loading-md"></div>
    {:else}
      {#if ($myGatewaysStore?.data ?? []).length === 0}
        <div class="text-sm opacity-70">
          No gateways found for your avatar.
        </div>
      {:else}
        <GenericList
          store={myGatewaysStore}
          row={GatewayRowView}
          rowHeight={64}
          maxPlaceholderPages={1}
          expectedPageSize={25}
        />
      {/if}
    {/if}
  </section>
</PageScaffold>
