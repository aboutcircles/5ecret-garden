<script lang="ts">
  import OrderDetailsPopup from '$lib/areas/market/orders/OrderDetailsPopup.svelte';
  import { popupControls } from '$lib/shared/state/popup';

  interface Props {
    item: {
      key: string;
      displayId?: string;
      status?: string;
      total?: { price?: number | null; priceCurrency?: string | null } | null;
      customerId?: string | null;
      snapshot?: any;
    };
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
      props: { snapshot: item.snapshot },
    });
  }
</script>

<button
  type="button"
  class="w-full bg-base-100 border shadow-sm rounded-xl px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-between cursor-pointer hover:bg-base-200/40 transition-colors text-left"
  onclick={openPopup}
>
  <div class="flex flex-col min-w-0 mr-3">
    <div class="font-mono text-sm truncate" title={idText}>{idText}</div>
    <div class="text-xs text-base-content/70 flex items-center gap-2 mt-0.5">
      <span class="badge badge-ghost badge-sm whitespace-nowrap">{statusText}</span>
      {#if totalText}
        <span class="opacity-60">•</span>
        <span class="truncate" title={totalText}>Total: {totalText}</span>
      {/if}
    </div>
  </div>
  <div class="shrink-0 flex items-center gap-2">
    <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" aria-hidden="true" />
  </div>
</button>
