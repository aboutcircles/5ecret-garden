<script lang="ts">
  import { formatTimestamp, statusLabel } from '$lib/areas/market/orders/status';
  import { popupControls, type PopupContentDefinition } from '$lib/shared/state/popup';
  import { SalesOrderDetailsPopup } from '$lib/areas/market/ui';
  import MarketOrderListRow from '$lib/areas/market/ui/MarketOrderListRow.svelte';
  interface Props {
    item: {
      key: string;
      orderNumber: string;
      orderDate?: string;
      orderStatus?: string;
      paymentReference?: string | null;
    };
  }

  let { item }: Props = $props();

  const dateText = $derived.by(() => {
    const raw = item.orderDate;
    return raw ? formatTimestamp(raw) : '—';
  });

  const statusText = $derived.by(() => statusLabel(item.orderStatus) ?? item.orderStatus ?? '—');

  const payRefText = $derived.by(() => {
    const v = item.paymentReference ?? null;
    return v && v.trim().length > 0 ? v : null;
  });

  function openPopup(): void {
    const def: PopupContentDefinition = {
      title: 'Sales order',
      component: SalesOrderDetailsPopup,
      props: { orderId: item.orderNumber },
    };
    popupControls.open(def);
  }
</script>

<MarketOrderListRow onOpen={openPopup} srLabel="Sales order">
  <div class="font-mono text-sm truncate" title={item.orderNumber}>{item.orderNumber}</div>
  <div class="text-xs text-base-content/70 flex items-center gap-2 mt-0.5">
    {#if statusText}
      <span class="badge badge-ghost badge-sm whitespace-nowrap">{statusText}</span>
    {/if}
    <span>{dateText}</span>
    {#if payRefText}
      <span class="opacity-60">•</span>
      <span class="truncate max-w-[22rem]" title={payRefText}>Pay ref: {payRefText}</span>
    {/if}
  </div>
</MarketOrderListRow>
