<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import type { Readable } from 'svelte/store';
  import { derived, writable } from 'svelte/store';
  import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
  import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
  import GatewayRowPlaceholder from '$lib/shared/ui/lists/placeholders/GatewayRowPlaceholder.svelte';
  import GatewayRowView from '$lib/areas/settings/ui/components/GatewayRow.svelte';
  import { openStep } from '$lib/shared/flow';
  import CreateGatewayProfile from '$lib/areas/settings/flows/gateway/CreateGatewayProfile.svelte';
  import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

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

  const filteredGatewaysStore = $derived.by(() => {
    const source = myGatewaysStore;
    return derived([source, query], ([$store, $query]) => {
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
  });

  const gatewaysDataLength = $derived(($myGatewaysStore?.data ?? []).length);
  const filteredGatewaysDataLength = $derived(($filteredGatewaysStore?.data ?? []).length);

  const onSearchInputKeydown = createListInputArrowDownHandler({
    getScope: () => gatewaysListScopeEl,
    rowSelector: '[data-gateway-row]'
  });

  function openCreateGatewayFlow() {
    openStep({
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

<section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
  <div style="min-width:0;">
    <h3 style="font-family:{T.fontSans};font-size:13px;font-weight:580;color:{T.ink};margin:0;">Payment gateways</h3>
    <p style="font-size:11.5px;color:{T.inkMuted};margin:2px 0 0 0;">
      {#if gatewayOwnerAddress}
        Owner <span style="font-family:{T.fontMono};color:{T.inkBody};">{shortGatewayAddr(gatewayOwnerAddress)}</span>
      {:else}
        Connect an avatar to manage gateways.
      {/if}
    </p>
  </div>
  {#if gatewayOwnerAddress && circlesReady}
    <button
      type="button"
      style="display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:9999px;border:0;cursor:pointer;background:{T.primary};color:#fff;font-size:12.5px;font-weight:580;box-shadow:0 4px 12px rgba(88,73,212,0.25);"
      onclick={openCreateGatewayFlow}
    ><Icon name="plus" size={11} stroke="#fff" strokeWidth={2.4} /> Create gateway</button>
  {/if}
</section>

<section style="background:{T.surface};border:1px solid {T.hairlineSoft};border-radius:14px;padding:14px 16px;width:100%;">
  {#if !gatewayOwnerAddress}
    <div style="font-size:12.5px;color:{T.inkMuted};">Connect an avatar to see your payment gateways.</div>
  {:else if !circlesReady}
    <div style="font-size:12.5px;color:{T.inkMuted};">Connect an avatar to load your gateways.</div>
  {:else if loadingGateways}
    <div style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:{T.inkMuted};">
      <svg class="ps-spin" style="width:16px;height:16px;color:{T.primary};" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/></svg>
      Loading gateways…
    </div>
  {:else}
    <div data-payment-gateway-list-scope bind:this={gatewaysListScopeEl}>
      <ListShell
        query={query}
        searchPlaceholder="Search by gateway address"
        inputDataAttribute="data-payment-gateway-search-input"
        onInputKeydown={onSearchInputKeydown}
        isEmpty={gatewaysDataLength === 0}
        ended={$myGatewaysStore?.ended ?? false}
        emptyRequiresEnd={true}
        isNoMatches={gatewaysDataLength > 0 && filteredGatewaysDataLength === 0}
        emptyLabel="No gateways found for your avatar."
        noMatchesLabel="No matching gateways"
        wrapInListContainer={false}
      >
        <GenericList
          store={filteredGatewaysStore}
          row={GatewayRowView}
          rowHeight={64}
          maxPlaceholderPages={2}
          expectedPageSize={25}
          placeholderRow={GatewayRowPlaceholder}
        />
      </ListShell>
    </div>
  {/if}
</section>

<style>
  @keyframes ps-spin { from {} to { transform: rotate(360deg); } }
  .ps-spin { animation: ps-spin 0.8s linear infinite; }
</style>
