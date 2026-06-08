<script lang="ts">
  import OrderDetailsPopup from '$lib/areas/market/orders/OrderDetailsPopup.svelte';
  import { popupControls } from '$lib/shared/state/popup';
  import MarketOrderListRow from '$lib/areas/market/ui/MarketOrderListRow.svelte';
  import type { MarketOrderSummaryListItem } from '$lib/areas/market/orders/ordersMappers';
  import { T } from '$lib/design-system/tokens.js';

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
  <div style="font-family:{T.fontMono};font-size:12.5px;color:{T.ink};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title={idText}>{idText}</div>
  <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:{T.inkMuted};">
    <span style="
      display:inline-flex;align-items:center;
      padding:2px 8px;border-radius:9999px;
      background:{T.pageDeep};color:{T.inkBody};
      font-size:10px;font-weight:540;letter-spacing:0.02em;
      white-space:nowrap;
    ">{statusText}</span>
    {#if totalText}
      <span style="color:{T.inkFaint};">•</span>
      <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title={totalText}>{totalText}</span>
    {/if}
  </div>
</MarketOrderListRow>
