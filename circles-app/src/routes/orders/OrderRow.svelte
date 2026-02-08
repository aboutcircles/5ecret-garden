<script lang="ts">
  interface Props {
    item: {
      key: string; // stable order id
      displayId: string; // what we display (orderNumber/paymentReference)
      status?: string;
      total?: { price?: number | null; priceCurrency?: string | null } | null;
      customerId?: string | null;
      snapshot?: any; // full order snapshot for details popup
    };
  }
  let { item }: Props = $props();

  // In runes mode, $derived expects an expression, not a function value.
  // Use a helper and call it inside $derived(...) to avoid rendering a function as text.
  import {formatCurrency} from '$lib/utils/money';
  import {statusLabel} from '$lib/areas/market/orders/status';
  import {type PopupContentDefinition, popupControls} from '$lib/shared/state/popup';
  import OrderDetailsPopup from '$lib/areas/market/orders/OrderDetailsPopup.svelte';

  const totalDisplay = $derived((() => {
    const price = item.total?.price ?? null;
    const cur = item.total?.priceCurrency ?? null;
    return price == null ? null : formatCurrency(price as number, cur as string | null);
  })());

  function goToDetails() {
    const def: PopupContentDefinition = {
      title: 'Order details',
      component: OrderDetailsPopup,
      props: { snapshot: item.snapshot ?? {} },
    };
    popupControls.open(def);
  }

  function hasOutbox(it: Props['item']): boolean {
    try {
      const arr = (it?.snapshot as any)?.outbox;
      return Array.isArray(arr) && arr.length > 0;
    } catch { return false; }
  }
</script>

<button
  type="button"
  class="w-full bg-base-100 border shadow-sm rounded-xl px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-between cursor-pointer hover:bg-base-200/40 transition-colors text-left"
  onclick={goToDetails}
>
  <div class="flex flex-col min-w-0 mr-3">
    <div class="font-mono text-sm truncate" title={item.displayId}>{item.displayId}</div>
    <div class="text-xs text-base-content/70 flex items-center gap-2 mt-0.5">
      {#if statusLabel(item.status)}
        <span class="badge badge-ghost badge-sm whitespace-nowrap">{statusLabel(item.status)}</span>
      {/if}
      {#if totalDisplay}
        <span class="opacity-80">Total: {totalDisplay}</span>
      {/if}
      {#if hasOutbox(item)}
        <span class="badge badge-primary badge-xs">Has outbox</span>
      {/if}
    </div>
  </div>
  <div class="shrink-0 flex items-center gap-2">
    <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" aria-hidden="true" />
  </div>

  <div class="sr-only">Order</div>
</button>
