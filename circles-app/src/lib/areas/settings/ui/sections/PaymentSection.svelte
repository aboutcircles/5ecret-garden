<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import type { Readable } from 'svelte/store';
  import { derived, writable } from 'svelte/store';
  import ListShell from '$lib/shared/ui/common/ListShell.svelte';
  import GenericList from '$lib/shared/ui/common/GenericList.svelte';
  import GatewayRowView from '$lib/areas/settings/ui/components/GatewayRow.svelte';
  import { popupControls } from '$lib/shared/state/popup';
  import CreateGatewayProfile from '$lib/areas/settings/flows/gateway/CreateGatewayProfile.svelte';
  import { createListInputArrowDownHandler } from '$lib/shared/utils/listInputArrowDown';

  type ListValue = { data: any[]; next: () => Promise<boolean>; ended: boolean };

  type Props = {
    gatewayOwnerAddress: Address | '';
    circlesReady: boolean;
    loadingGateways: boolean;
    myGatewaysStore: Readable<ListValue>;
    shortGatewayAddr: (a?: string) => string;
    onReloadGateways?: () => void;
  };

  let { gatewayOwnerAddress, circlesReady, loadingGateways, myGatewaysStore, shortGatewayAddr, onReloadGateways }: Props = $props();

  const query = writable('');
  let gatewaysListScopeEl: HTMLDivElement | null = $state(null);

  const filteredGatewaysStore = derived([myGatewaysStore, query], ([$store, $query]) => {
    const q = ($query ?? '').toLowerCase().trim();
    if (!q) return $store;

    const data = ($store?.data ?? []).filter((it: any) => {
      const gateway = String(it?.gateway ?? '').toLowerCase();
      return gateway.includes(q);
    });

    return {
      ...$store,
      data,
    };
  });

  const gatewaysDataLength = $derived(($myGatewaysStore?.data ?? []).length);
  const filteredGatewaysDataLength = $derived(($filteredGatewaysStore?.data ?? []).length);

  const onSearchInputKeydown = createListInputArrowDownHandler({
    getScope: () => gatewaysListScopeEl,
    rowSelector: '[data-gateway-row]'
  });

  function openCreateGatewayFlow() {
    popupControls.open({
      title: 'Create payment gateway',
      component: CreateGatewayProfile,
      props: {
        onCreated: async () => {
          onReloadGateways?.();
        }
      }
    });
  }
</script>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-sm font-semibold m-0">Payment gateways</h3>
      <p class="text-xs text-base-content/70 mt-0.5">
        {#if gatewayOwnerAddress}
          Owner {shortGatewayAddr(gatewayOwnerAddress)}.
        {:else}
          Connect an avatar to manage gateways.
        {/if}
      </p>
    </div>
    {#if gatewayOwnerAddress && circlesReady}
      <button type="button" class="btn btn-sm btn-primary" onclick={openCreateGatewayFlow}>
        Create gateway
      </button>
    {/if}
  </div>
</section>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  {#if !gatewayOwnerAddress}
    <div class="text-sm opacity-70">Connect an avatar to see your payment gateways.</div>
  {:else if !circlesReady}
    <div class="text-sm opacity-70">Connect an avatar to load your gateways.</div>
  {:else if loadingGateways}
    <div class="loading loading-spinner loading-md"></div>
  {:else}
    <div data-payment-gateway-list-scope bind:this={gatewaysListScopeEl}>
      <ListShell
        query={query}
        searchPlaceholder="Search by gateway address"
        inputDataAttribute="data-payment-gateway-search-input"
        onInputKeydown={onSearchInputKeydown}
        isEmpty={gatewaysDataLength === 0}
        isNoMatches={gatewaysDataLength > 0 && filteredGatewaysDataLength === 0}
        emptyLabel="No gateways found for your avatar."
        noMatchesLabel="No matching gateways"
        wrapInListContainer={false}
      >
        <GenericList
          store={filteredGatewaysStore}
          row={GatewayRowView}
          rowHeight={64}
          maxPlaceholderPages={1}
          expectedPageSize={25}
        />
      </ListShell>
    </div>
  {/if}
</section>
