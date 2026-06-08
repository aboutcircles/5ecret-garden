<script lang="ts">
  import { formatTimestamp, statusLabel } from '$lib/areas/market/orders/status';
  import { popupControls, type PopupContentDefinition } from '$lib/shared/state/popup';
  import OrderDetailsPopup from '$lib/areas/market/orders/OrderDetailsPopup.svelte';
  import MarketOrderListRow from '$lib/areas/market/ui/MarketOrderListRow.svelte';
  import { T } from '$lib/design-system/tokens.js';
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
      component: OrderDetailsPopup,
      props: { mode: 'seller', orderId: item.orderNumber, showHistory: false, showAdvanced: false },
    };
    popupControls.open(def);
  }
</script>

<MarketOrderListRow onOpen={openPopup} srLabel="Sales order">
  <div style="font-family:{T.fontMono};font-size:12.5px;color:{T.ink};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title={item.orderNumber}>{item.orderNumber}</div>
  <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:{T.inkMuted};flex-wrap:wrap;">
    {#if statusText}
      <span style="
        display:inline-flex;align-items:center;
        padding:2px 8px;border-radius:9999px;
        background:{T.pageDeep};color:{T.inkBody};
        font-size:10px;font-weight:540;letter-spacing:0.02em;white-space:nowrap;
      ">{statusText}</span>
    {/if}
    <span style="white-space:nowrap;">{dateText}</span>
    {#if payRefText}
      <span style="color:{T.inkFaint};">•</span>
      <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:18rem;font-family:{T.fontMono};font-size:10.5px;" title={payRefText}>Ref: {payRefText}</span>
    {/if}
  </div>
</MarketOrderListRow>
