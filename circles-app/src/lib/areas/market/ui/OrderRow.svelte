<script lang="ts">
  import OrderDetailsPopup from '$lib/areas/market/orders/OrderDetailsPopup.svelte';
  import { popupControls } from '$lib/shared/state/popup';
  import MarketOrderListRow from '$lib/areas/market/ui/MarketOrderListRow.svelte';
  import type { MarketOrderSummaryListItem } from '$lib/areas/market/orders/ordersMappers';

  interface Props {
    item: MarketOrderSummaryListItem;
  }

  let { item }: Props = $props();

  const idText = $derived(item.displayId ?? item.key ?? '—');
  const statusText = $derived(item.status ?? '—');
  const totalText = $derived.by(() => {
    const amount = item.total?.price;
    const currency = item.total?.priceCurrency;
    if (amount == null) return null;
    return `${amount}${currency ? ` ${currency}` : ''}`;
  });

  function openPopup(): void {
    if (!item.snapshot) return;
    popupControls.open({
      title: `Order ${idText}`,
      component: OrderDetailsPopup,
      props: { mode: 'buyer', snapshot: item.snapshot },
    });
  }
</script>

<MarketOrderListRow onOpen={openPopup}>
  <div class="font-mono text-sm truncate" title={idText}>{idText}</div>
  <div class="text-xs text-base-content/70 flex items-center gap-2 mt-0.5">
    <span class="badge badge-ghost badge-sm whitespace-nowrap">{statusText}</span>
    {#if totalText}
      <span class="opacity-60">•</span>
      <span class="truncate" title={totalText}>Total: {totalText}</span>
    {/if}
  </div>
</MarketOrderListRow>
