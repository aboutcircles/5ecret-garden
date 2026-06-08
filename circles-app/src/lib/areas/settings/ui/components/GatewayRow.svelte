<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { GatewayRow as GatewayRowType } from '$lib/areas/settings/model/gatewayTypes';
  import { openStep } from '$lib/shared/flow';
  import ManageTrust from '$lib/areas/settings/flows/gateway/ManageTrust.svelte';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    item: GatewayRowType;
  }

  let { item }: Props = $props();

  const createdAt = $derived.by(() =>
    item.timestamp ? new Date(Number(item.timestamp) * 1000).toLocaleString() : ''
  );

  function openManageTrust() {
    if (!item?.gateway) return;
    openStep({
      title: 'Payment gateway',
      component: ManageTrust,
      props: { gateway: item.gateway }
    });
  }

  function focusGatewaySearchInput(current?: HTMLElement | null): void {
    const scope = current?.closest<HTMLElement>('[data-payment-gateway-list-scope]')
      ?? document.querySelector<HTMLElement>('[data-payment-gateway-list-scope]');
    const input = scope?.querySelector<HTMLInputElement>('[data-payment-gateway-search-input]');
    input?.focus();
  }

  const listNavigator = createKeyboardListNavigator({
    getRows: (anchor) => {
      const scope = anchor?.closest<HTMLElement>('[data-payment-gateway-list-scope]')
        ?? document.querySelector<HTMLElement>('[data-payment-gateway-list-scope]');
      return Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-gateway-row]'));
    },
    focusInput: focusGatewaySearchInput,
    onActivateRow: () => openManageTrust(),
  });

  function onRowKeydown(event: KeyboardEvent): void {
    listNavigator.onRowKeydown(event);
  }

  function onRowClick(event: MouseEvent): void {
    listNavigator.onRowClick(event);
    openManageTrust();
  }
</script>

<div
  data-gateway-row
  tabindex={0}
  role="button"
  aria-label={`Manage trust for gateway ${item.gateway}`}
  style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;background:{T.surface};border:1px solid {T.hairlineSoft};cursor:pointer;width:100%;box-sizing:border-box;transition:background 180ms ease-out, border-color 180ms ease-out;outline:none;"
  onkeydown={onRowKeydown}
  onclick={onRowClick}
>
  <div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;">
    <Avatar
      address={item.gateway}
      view="horizontal"
      clickable={true}
      bottomInfo={createdAt ? `Created ${createdAt}` : undefined}
    />
  </div>
  <div aria-hidden="true">
    <img src="/chevron-right.svg" alt="" style="width:16px;height:16px;opacity:0.7;" aria-hidden="true" />
  </div>
</div>

<style>
  [data-gateway-row]:hover,
  [data-gateway-row]:focus-visible {
    background: #F6F5F2 !important;
    border-color: rgba(31,17,70,0.12) !important;
  }
</style>
