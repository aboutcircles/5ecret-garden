<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import type { AggregatedCatalogItem } from '$lib/areas/market/model';
  import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
  import { gnosisConfig } from '$lib/shared/config/circles';
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import AdminStatusBadge from '$lib/areas/admin/components/AdminStatusBadge.svelte';
  import { adminProductKey } from '$lib/areas/admin/helpers';
  import { normalizeSku } from '$lib/areas/admin/productEditorUtils';
  import { openStep } from '$lib/shared/flow';
  import FlowStepScaffold from '$lib/shared/ui/flow/FlowStepScaffold.svelte';
  import StepAlert from '$lib/shared/ui/flow/StepAlert.svelte';
  import { NEW_PRODUCT_FLOW_SCAFFOLD_BASE } from './constants';
  import StepActionBar from '$lib/shared/ui/flow/StepActionBar.svelte';
  import TypeStep from './3_Type.svelte';
  import type { AdminUnifiedProduct, AdminOdooConnection } from '$lib/areas/admin/types';
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

  function resolvePriceAmount(item: AggregatedCatalogItem): number | null {
    const offer: any = (item as any)?.offer ?? (item as any)?.offers ?? (item as any)?.product?.offer ?? (item as any)?.product?.offers;
    const pick = Array.isArray(offer) ? offer[0] : offer;
    const price = pick?.price;
    if (typeof price === 'number' && Number.isFinite(price)) return price;
    return null;
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
      const catalog = getMarketClient().catalog.forOperator(String(gnosisConfig.production.marketOperator));
      const items = await catalog.fetchSellerCatalog(seller);
      const filtered = items.filter((p) => (p.seller ?? '').toLowerCase() === seller.toLowerCase());
      catalogItems = filtered.sort((a, b) => {
        const mappedA = isMappedCatalogItem(a);
        const mappedB = isMappedCatalogItem(b);
        if (mappedA !== mappedB) return mappedA ? 1 : -1;

        const priceA = resolvePriceAmount(a) ?? Number.POSITIVE_INFINITY;
        const priceB = resolvePriceAmount(b) ?? Number.POSITIVE_INFINITY;
        if (priceA !== priceB) return priceA - priceB;

        const nameA = String(a?.product?.name ?? a?.product?.sku ?? '').toLowerCase();
        const nameB = String(b?.product?.name ?? b?.product?.sku ?? '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } catch (e) {
      catalogError = e instanceof Error ? e.message : String(e);
    } finally {
      catalogLoading = false;
    }
  }

  $effect(() => {
    void loadCatalog();
  });

  function resolveProductTitle(item: AggregatedCatalogItem): string {
    const nameRaw = (item as any)?.product?.name ?? '';
    const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';
    const sku = normalizeSku((item as any)?.product?.sku ?? '') ?? String((item as any)?.product?.sku ?? '').trim();
    if (name) return "Fulfillment: " + name;
    return sku || 'Selected product';
  }

  function goNext(item: AggregatedCatalogItem): void {
    context.catalogItem = item;
    openStep({
      title: resolveProductTitle(item),
      component: TypeStep,
      props: { context, connections, existingProducts, onExecute, onCreateConnection },
      key: 'admin-new-product-type',
    });
  }
</script>

<FlowStepScaffold
  {...NEW_PRODUCT_FLOW_SCAFFOLD_BASE}
  step={2}
  title="Catalog"
  subtitle="Select the product you want to offer."
>

    <StepActionBar className="mt-0" align="between" stackOnMobile={false}>
      {#snippet primary()}
        <button class="btn btn-outline btn-sm" type="button" onclick={loadCatalog} disabled={catalogLoading}>
          {catalogLoading ? 'Loading…' : 'Reload'}
        </button>
      {/snippet}
    </StepActionBar>

    {#if catalogError}
      <StepAlert variant="warning" message={catalogError} />
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
  </FlowStepScaffold>
