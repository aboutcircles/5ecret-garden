<script lang="ts">
  interface Props {
    item: {
      id: string; // orderNumber
      status?: string;
      total?: { price?: number | null; priceCurrency?: string | null } | null;
      customerId?: string | null;
    };
  }
  let { item }: Props = $props();

  // In runes mode, $derived expects an expression, not a function value.
  // Use a helper and call it inside $derived(...) to avoid rendering a function as text.
  function _formatTotal(it: Props['item']): string | null {
    const price = it.total?.price;
    const cur = it.total?.priceCurrency || '';
    if (price == null || !Number.isFinite(Number(price))) return null;
    const val = Number(price).toFixed(2);
    return cur ? `${val} ${cur}` : val;
  }

  const totalDisplay = $derived(_formatTotal(item));

  function statusLabel(status?: string): string | null {
    if (!status) return null;
    // If it's a URL like https://schema.org/OrderProcessing, show the last segment
    try {
      const url = new URL(status);
      return url.pathname.split('/').pop() || status;
    } catch {
      return status;
    }
  }

  function copyId() {
    navigator.clipboard?.writeText(item.id).catch(() => {});
  }

  import { popupControls, type PopupContentDefinition } from '$lib/stores/popUp';
  import OrderDetailsPopup from '$lib/orders/OrderDetailsPopup.svelte';

  function goToDetails() {
    const def: PopupContentDefinition = {
      title: 'Order details',
      component: OrderDetailsPopup,
      props: { orderId: item.id },
    };
    popupControls.open(def);
  }
</script>

<div
  class="w-full bg-base-100 border shadow-sm rounded-xl px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-between cursor-pointer hover:bg-base-200/40 transition-colors"
  role="listitem button"
  tabindex="0"
  onclick={goToDetails}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToDetails(); } }}
>
  <div class="flex flex-col min-w-0 mr-3">
    <div class="font-mono text-sm truncate" title={item.id}>{item.id}</div>
    <div class="text-xs text-base-content/70 flex items-center gap-2 mt-0.5">
      {#if statusLabel(item.status)}
        <span class="badge badge-ghost badge-sm whitespace-nowrap">{statusLabel(item.status)}</span>
      {/if}
      {#if totalDisplay}
        <span class="opacity-80">Total: {totalDisplay}</span>
      {/if}
    </div>
  </div>
  <div class="flex items-center gap-2 flex-shrink-0">
    <button class="btn btn-xs btn-ghost" title="Copy order id" onclick={(e) => { e.stopPropagation(); copyId(); }}>Copy</button>
  </div>
  <div class="sr-only">Order id</div>
</div>
