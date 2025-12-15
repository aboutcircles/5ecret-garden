<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { popupControls, popupState } from '$lib/stores/popup';
  import SalesOrderDetailsPopup from '$lib/sales/SalesOrderDetailsPopup.svelte';

  const orderId = $derived(decodeURIComponent($page.params.orderId || ''));

  onMount(() => {
    // Open the popup immediately for deep-link support
    popupControls.open({ title: 'Sales order', component: SalesOrderDetailsPopup, props: { orderId } });

    const unsub = popupState.subscribe((s) => {
      if (!s?.content) {
        // When popup fully closes, navigate back to the sales list
        goto('/sales/orders');
      }
    });
    return () => { unsub(); };
  });
</script>

<!-- Route wrapper that opens the popup; no page UI here -->
<div></div>
