<script lang="ts">
  import OrderDetailsView from '$lib/orders/OrderDetailsView.svelte';

  // Security: Do NOT accept or render order keys in the UI. Instead, this popup
  // now expects a full snapshot to be provided by the caller (e.g., from an
  // authenticated listing) and only allows copying the JSON, not any secret.

  interface Props { snapshot: any }
  let { snapshot }: Props = $props();

  let jsonText: string = $state(JSON.stringify(snapshot ?? {}, null, 2));

  function copyJson() {
    navigator.clipboard?.writeText(jsonText).catch(() => {});
  }
</script>

<div class="flex flex-col gap-3 w-full max-w-[min(92vw,52rem)]">
  <div class="flex items-start justify-between gap-3">
    <div class="text-xs opacity-70">Order details</div>
    <div class="flex items-center gap-2">
      <button class="btn btn-xs btn-ghost" onclick={copyJson}>Copy JSON</button>
    </div>
  </div>

  <OrderDetailsView {snapshot} />

  <details class="mt-2">
    <summary class="cursor-pointer text-sm opacity-70 hover:opacity-100">View raw JSON</summary>
    <div class="bg-base-100 border rounded-xl shadow-sm overflow-hidden mt-2">
      <pre class="m-0 p-4 text-xs overflow-auto"><code>{jsonText}</code></pre>
    </div>
  </details>
</div>
