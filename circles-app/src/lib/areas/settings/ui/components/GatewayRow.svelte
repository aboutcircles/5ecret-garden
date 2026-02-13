<script lang="ts">
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { GatewayRow as GatewayRowType } from '$lib/areas/settings/model/gatewayTypes';
  import { openStep } from '$lib/shared/flow/runtime';
  import ManageTrust from '$lib/areas/settings/flows/gateway/ManageTrust.svelte';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';

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
      title: 'Manage trust',
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
  class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
  onkeydown={onRowKeydown}
  onclick={onRowClick}
>
  <RowFrame clickable={true} dense={true} noLeading={true}>
    <div class="w-full flex items-center justify-between gap-3">
      <div class="min-w-0 flex items-center gap-2">
        <Avatar
          address={item.gateway}
          view="horizontal"
          clickable={true}
          bottomInfo={createdAt ? `Created ${createdAt}` : undefined}
        />
      </div>
      {#snippet trailing()}
        <div aria-hidden="true">
          <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" aria-hidden="true" />
        </div>
      {/snippet}
    </div>
  </RowFrame>
</div>
