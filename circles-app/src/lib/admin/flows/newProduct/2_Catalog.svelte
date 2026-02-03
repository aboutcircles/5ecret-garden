<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import type { AggregatedCatalogItem } from '$lib/market/types';
  import { getMarketClient } from '$lib/sdk/marketClient';
  import { gnosisConfig } from '$lib/circlesConfig';
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import RowFrame from '$lib/ui/RowFrame.svelte';
  import AdminStatusBadge from '$lib/admin/components/AdminStatusBadge.svelte';
  import { adminProductKey } from '$lib/admin/helpers';
  import { normalizeSku } from '$lib/admin/productEditorUtils';
  import { popupControls } from '$lib/stores/popup';
  import TypeStep from './3_Type.svelte';
  import type { AdminUnifiedProduct, AdminOdooConnection } from '$lib/admin/types';
  import type { AdminNewProductFlowContext } from './context';

  interface Props {
    context: AdminNewProductFlowContext;
    connections: AdminOdooConnection[];
    existingProducts: AdminUnifiedProduct[];
    onExecute: (payload: any) => Promise<void>;
    onCreateConnection: (payload: { connection: any }) => Promise<AdminOdooConnection>;
  }

  let { context, connections, existingProducts, onExecute, onCreateConnection }: Props = $props();

  let catalogLoading = $state(false);
  let catalogError = $state<string | null>(null);
  let catalogItems = $state<AggregatedCatalogItem[]>([]);

  const normalizedSeller = $derived(
    context.seller ? (normalizeAddress(String(context.seller)) as Address) : undefined
  );

  const existingKeys = $derived.by(() => {
    const keys = new Set<string>();
    for (const p of existingProducts ?? []) {
      keys.add(adminProductKey(p.chainId, String(p.seller), p.sku));
    }
    return keys;
  });

  function productKeyForCatalogItem(item: AggregatedCatalogItem): string | null {
    if (!normalizedSeller) return null;
    const skuRaw = item?.product?.sku ?? '';
    const normSku = normalizeSku(skuRaw);
    if (!normSku) return null;
    return adminProductKey(context.chainId, String(normalizedSeller), normSku);
  }

  function isMappedCatalogItem(item: AggregatedCatalogItem): boolean {
    const key = productKeyForCatalogItem(item);
    if (!key) return false;
    return existingKeys.has(key);
  }

  function productImageUrl(item: AggregatedCatalogItem): string | null {
    const img = item?.product?.image as unknown;
    if (!img) return null;
    if (typeof img === 'string') return img;
    if (Array.isArray(img)) {
      const first = img.find((x) => typeof x === 'string') as string | undefined;
      return first ?? null;
    }
    return null;
  }

  async function loadCatalog(): Promise<void> {
    const seller = context.seller ? (normalizeAddress(String(context.seller)) as Address) : undefined;
    if (!seller) return;
    catalogLoading = true;
    catalogError = null;
    catalogItems = [];
    try {
      const catalog = getMarketClient().catalog.forOperator(gnosisConfig.production.marketOperator);
      const items = await catalog.fetchSellerCatalog(seller);
      catalogItems = items.filter((p) => (p.seller ?? '').toLowerCase() === seller.toLowerCase());
    } catch (e) {
      catalogError = e instanceof Error ? e.message : String(e);
    } finally {
      catalogLoading = false;
    }
  }

  $effect(() => {
    void loadCatalog();
  });

  function goNext(item: AggregatedCatalogItem): void {
    context.catalogItem = item;
    popupControls.open({
      title: 'Setup product - Fulfillment strategy',
      component: TypeStep,
      props: { context, connections, existingProducts, onExecute, onCreateConnection },
      id: 'admin-new-product-type',
    });
  }
</script>

<div class="space-y-3">
  <div class="text-sm">
    <span class="opacity-70">Seller:</span>
    <code class="ml-2 font-mono">{normalizedSeller ?? ''}</code>
  </div>

  <div class="flex items-center justify-between gap-2">
    <p class="text-sm opacity-70">Pick a catalog product (SKU) to configure.</p>
    <button class="btn btn-outline btn-sm" type="button" onclick={loadCatalog} disabled={catalogLoading}>
      {catalogLoading ? 'Loading…' : 'Reload'}
    </button>
  </div>

  {#if catalogError}
    <div class="alert alert-warning text-sm">{catalogError}</div>
  {/if}

  {#if catalogLoading}
    <div class="flex items-center gap-2 text-base-content/70 py-2">
      <span class="loading loading-spinner loading-sm"></span>
      <span>Loading catalog…</span>
    </div>
  {:else if catalogItems.length === 0}
    <p class="text-sm opacity-70">No catalog products found for this seller.</p>
  {:else}
    <div class="w-full flex flex-col gap-y-1.5" role="list">
      {#each catalogItems as p (p.productCid ?? p.linkKeccak ?? p.indexInChunk)}
        {@const mapped = isMappedCatalogItem(p)}
        {@const imgUrl = productImageUrl(p)}
        <RowFrame
          dense={true}
          clickable={!mapped}
          disabled={mapped}
          selected={context.catalogItem?.linkKeccak === p.linkKeccak}
          onclick={() => {
            if (mapped) return;
            goNext(p);
          }}
        >
          {#snippet leading()}
            {#if imgUrl}
              <img src={imgUrl} alt="" class="w-10 h-10 rounded-md object-cover bg-base-200" />
            {:else}
              <div class="w-10 h-10 rounded-md bg-base-200"></div>
            {/if}
          {/snippet}
          {#snippet title()}
            {p.product?.name ?? p.product?.sku}
          {/snippet}
          {#snippet subtitle()}
            <span class="font-mono">{normalizeSku(p.product?.sku ?? '') ?? p.product?.sku ?? ''}</span>
          {/snippet}
          {#snippet trailing()}
            {#if mapped}
              <AdminStatusBadge label="Already configured" variant="neutral" />
            {:else}
              <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" />
            {/if}
          {/snippet}
        </RowFrame>
      {/each}
    </div>
  {/if}
</div>
