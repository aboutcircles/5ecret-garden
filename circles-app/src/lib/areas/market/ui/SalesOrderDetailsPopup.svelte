<script lang="ts">
  import OrderDetailsPopup from '$lib/areas/market/orders/OrderDetailsPopup.svelte';

  interface Props {
    orderId: string;
  }
  let { orderId }: Props = $props();
</script>

<OrderDetailsPopup mode="seller" {orderId} showHistory={false} showAdvanced={false} />
