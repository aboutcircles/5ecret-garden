<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { popupControls, popupState } from '$lib/shared/state/popup/popUp.svelte';
  import { SalesOrderDetailsPopup } from '$lib/areas/market/ui';
  const orderId = $derived(decodeURIComponent($page.params.orderId || ''));

  onMount(() => {
    // Open the popup immediately for deep-link support
    popupControls.open({ title: 'Sales order', component: SalesOrderDetailsPopup, props: { orderId } });

    // When popup fully closes, navigate back to the sales list
    $effect(() => {
      if (!popupState.content) {
        goto('/sales/orders');
      }
    });
  });
</script>

<!-- Route wrapper that opens the popup; no page UI here -->
<div></div>
