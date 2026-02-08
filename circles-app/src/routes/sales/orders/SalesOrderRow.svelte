<script lang="ts">
  import { formatTimestamp, statusLabel } from '$lib/orders/status';
  import { popupControls, type PopupContentDefinition } from '$lib/shared/state/popup';
  import SalesOrderDetailsPopup from '$lib/domains/market/ui/SalesOrderDetailsPopup.svelte';

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

<button
  type="button"
  class="w-full bg-base-100 border shadow-sm rounded-xl px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-between cursor-pointer hover:bg-base-200/40 transition-colors text-left"
  onclick={openPopup}
>
  <div class="flex flex-col min-w-0 mr-3">
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
  </div>
  <div class="shrink-0 flex items-center gap-2">
    <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" aria-hidden="true" />
  </div>

  <div class="sr-only">Sales order</div>
</button>
