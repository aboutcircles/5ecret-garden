<script lang="ts">
  import OrderDetailsView from '$lib/orders/OrderDetailsView.svelte';
  import { getOrder, CartHttpError } from '$lib/cart/client';
  import { onMount } from 'svelte';

  interface Props { orderId: string }
  let { orderId }: Props = $props();

  let loading = $state(true);
  let error: string | null = $state(null);
  let snapshot: any = $state(null);
  let jsonText: string = $state('{}');

  async function load() {
    loading = true;
    error = null;
    snapshot = null;
    try {
      const snap = await getOrder(orderId);
      snapshot = snap;
      jsonText = JSON.stringify(snap, null, 2);
    } catch (e: any) {
      if (e instanceof CartHttpError && e.status === 404) {
        error = 'Order not found';
      } else {
        error = e?.message || 'Failed to load order';
      }
    } finally {
      loading = false;
    }
  }

  onMount(load);

  function copyId() {
    navigator.clipboard?.writeText(orderId).catch(() => {});
  }
  function copyJson() {
    navigator.clipboard?.writeText(jsonText).catch(() => {});
  }
</script>

<div class="flex flex-col gap-3 w-full max-w-[min(92vw,52rem)]">
  <div class="flex items-start justify-between gap-3">
    <div class="font-mono text-xs opacity-70 truncate" title={orderId}>{orderId}</div>
    <div class="flex items-center gap-2">
      <button class="btn btn-xs btn-ghost" onclick={copyId}>Copy ID</button>
      <button class="btn btn-xs btn-ghost" onclick={copyJson}>Copy JSON</button>
    </div>
  </div>

  {#if loading}
    <div class="flex items-center gap-2 text-base-content/70 py-6">
      <span class="loading loading-spinner text-primary"></span>
      <span>Loading order…</span>
    </div>
  {:else}
    {#if error}
      <div class="alert alert-warning">
        <span>{error}</span>
      </div>
    {/if}
    <OrderDetailsView {snapshot} />

    <details class="mt-2">
      <summary class="cursor-pointer text-sm opacity-70 hover:opacity-100">View raw JSON</summary>
      <div class="bg-base-100 border rounded-xl shadow-sm overflow-hidden mt-2">
        <pre class="m-0 p-4 text-xs overflow-auto"><code>{jsonText}</code></pre>
      </div>
    </details>
  {/if}
</div>
