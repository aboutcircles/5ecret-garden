<script lang="ts">
  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { getOrder, CartHttpError } from '$lib/cart/client';
  import OrderDetailsView from '$lib/orders/OrderDetailsView.svelte';

  const orderId: string | null = $derived($page.params?.id ?? null);

  let loading = $state<boolean>(true);
  let error: string | null = $state<string | null>(null);
  let jsonText: string = $state<string>('{}');
  let snapshot: any = $state<any>(null);

  async function load(): Promise<void> {
    if (!browser || !orderId) {
      loading = false;
      return;
    }
    loading = true;
    error = null;
    try {
      const snap = await getOrder(orderId);
      snapshot = snap;
      jsonText = JSON.stringify(snap, null, 2);
    } catch (e: unknown) {
      if (e instanceof CartHttpError && e.status === 404) {
        error = 'Order not found';
      } else {
        error = e instanceof Error ? e.message : 'Failed to load order';
      }
      snapshot = null;
      jsonText = '{}';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    // Re-run when the route param changes on client
    void load();
  });

  function copyId(): void {
    if (!orderId) return;
    navigator.clipboard?.writeText(orderId).catch(() => {});
  }
  function copyJson(): void {
    navigator.clipboard?.writeText(jsonText).catch(() => {});
  }

  const actions: { id: string; label: string; variant: 'primary' | 'ghost'; onClick: () => void }[] = [
    { id: 'copy-id', label: 'Copy ID', variant: 'ghost', onClick: copyId },
    { id: 'copy-json', label: 'Copy JSON', variant: 'ghost', onClick: copyJson },
  ];
</script>

<PageScaffold
  highlight="soft"
  collapsedMode="bar"
  collapsedHeightClass="h-12"
  maxWidthClass="page page--lg"
  contentWidthClass="page page--lg"
  usePagePadding={true}
  headerTopGapClass="mt-4 md:mt-6"
  collapsedTopGapClass="mt-3 md:mt-4"
>
  <svelte:fragment slot="title">
    <h1 class="h2">Order Details</h1>
  </svelte:fragment>
  <svelte:fragment slot="meta">
    <span class="font-mono text-xs opacity-80" title={orderId || ''}>{orderId}</span>
  </svelte:fragment>
  <svelte:fragment slot="actions">
    {#each actions as a (a.id)}
      <button type="button" class={`btn btn-sm ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`} onclick={a.onClick} aria-label={a.label}>
        <span>{a.label}</span>
      </button>
    {/each}
  </svelte:fragment>
  <svelte:fragment slot="collapsed-left">
    <span class="text-base md:text-lg font-semibold tracking-tight text-base-content">Order</span>
  </svelte:fragment>
  <svelte:fragment slot="collapsed-menu">
    {#each actions as a (a.id)}
      <button
        type="button"
        class={`btn ${a.variant === 'primary' ? 'btn-primary' : 'btn-ghost'} min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] w-full justify-start px-3`}
        onclick={a.onClick}
        aria-label={a.label}
      >
        <span>{a.label}</span>
      </button>
    {/each}
  </svelte:fragment>

  {#if loading}
    <div class="flex items-center gap-2 text-base-content/70 py-6">
      <span class="loading loading-spinner text-primary"></span>
      <span>Loading order…</span>
    </div>
  {:else}
    {#if error}
      <div class="alert alert-warning my-2">
        <span>{error}</span>
      </div>
    {/if}
    <OrderDetailsView {snapshot} />

    <details class="mt-4">
      <summary class="cursor-pointer text-sm opacity-70 hover:opacity-100">View raw JSON</summary>
      <div class="bg-base-100 border rounded-xl shadow-sm overflow-hidden mt-2">
        <pre class="m-0 p-4 text-xs overflow-auto"><code>{jsonText}</code></pre>
      </div>
    </details>
  {/if}
</PageScaffold>
