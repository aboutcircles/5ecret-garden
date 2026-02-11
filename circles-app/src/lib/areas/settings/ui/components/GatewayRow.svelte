<script lang="ts">
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { GatewayRow as GatewayRowType } from '$lib/areas/settings/model/gatewayTypes';
  import { popupControls } from '$lib/shared/state/popup';
  import ManageTrust from '$lib/areas/settings/flows/gateway/ManageTrust.svelte';

  interface Props {
    item: GatewayRowType;
  }

  let { item }: Props = $props();

  const createdAt = $derived.by(() =>
    item.timestamp ? new Date(Number(item.timestamp) * 1000).toLocaleString() : ''
  );

  function openManageTrust() {
    if (!item?.gateway) return;
    popupControls.open({
      title: 'Manage trust',
      component: ManageTrust,
      props: { gateway: item.gateway }
    });
  }

  function focusGatewaySearchInput(current: HTMLElement): void {
    const scope = current.closest<HTMLElement>('[data-payment-gateway-list-scope]');
    const input = scope?.querySelector<HTMLInputElement>('[data-payment-gateway-search-input]');
    input?.focus();
  }

  function onRowKeydown(event: KeyboardEvent): void {
    const current = event.currentTarget as HTMLElement | null;
    if (!current) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openManageTrust();
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    const scope = current.closest<HTMLElement>('[data-payment-gateway-list-scope]');
    const rows = Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-gateway-row]'));
    const index = rows.indexOf(current);
    if (index === -1) return;

    event.preventDefault();

    if (event.key === 'ArrowUp' && index === 0) {
      focusGatewaySearchInput(current);
      return;
    }

    const nextIndex = event.key === 'ArrowDown' ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= rows.length) return;
    rows[nextIndex]?.focus();
  }

  function onRowClick(event: MouseEvent): void {
    const current = event.currentTarget as HTMLElement | null;
    current?.focus();
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
