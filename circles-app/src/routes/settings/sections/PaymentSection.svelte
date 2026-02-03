<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import type { Readable } from 'svelte/store';
  import GenericList from '$lib/components/GenericList.svelte';
  import GatewayRowView from '$lib/gateway/GatewayRow.svelte';
  import { popupControls } from '$lib/stores/popup';
  import CreateGatewayProfile from '$lib/flows/paymentGateway/CreateGatewayProfile.svelte';

  type Props = {
    gatewayOwnerAddress: Address | '';
    circlesReady: boolean;
    loadingGateways: boolean;
    myGatewaysStore: Readable<{ data: any[]; next: () => Promise<boolean>; ended: boolean }>;
    shortGatewayAddr: (a?: string) => string;
    onReloadGateways?: () => void;
  };

  let { gatewayOwnerAddress, circlesReady, loadingGateways, myGatewaysStore, shortGatewayAddr, onReloadGateways }: Props = $props();

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
  <div class="flex items-center justify-between mb-3">
    <div class="text-sm">
      <strong>Payment gateways</strong>
      {#if gatewayOwnerAddress}
        <span class="opacity-60"> · Owner {shortGatewayAddr(gatewayOwnerAddress)}</span>
      {/if}
    </div>
    {#if gatewayOwnerAddress && circlesReady}
      <button type="button" class="btn btn-sm btn-primary" onclick={openCreateGatewayFlow}>
        Create gateway
      </button>
    {/if}
  </div>

  {#if !gatewayOwnerAddress}
    <div class="text-sm opacity-70">Connect an avatar to see your payment gateways.</div>
  {:else if !circlesReady}
    <div class="text-sm opacity-70">Connect an avatar to load your gateways.</div>
  {:else if loadingGateways}
    <div class="loading loading-spinner loading-md"></div>
  {:else}
    {#if ($myGatewaysStore?.data ?? []).length === 0}
      <div class="text-sm opacity-70">No gateways found for your avatar.</div>
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
