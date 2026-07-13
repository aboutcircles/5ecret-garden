<script module lang="ts">
  // Cross-instance thumbnail cache, keyed by `seller|sku`. Declared in `<script module>` so it
  // is genuinely shared across ALL AdminProductRow instances — surviving tab-switch remounts and
  // `loadAdminData()` reloads. (An instance-scoped Map would be re-created empty per row and
  // never serve a hit.) Only *resolved* values are cached (including a legitimate "no image");
  // thrown fetches are left uncached so a transient failure can retry on a later mount. Bounded
  // with FIFO eviction so a long admin session browsing many sellers can't grow it unbounded.
  const IMAGE_CACHE_MAX = 1000;
  const imageCache = new Map<string, string | null>();

  function cacheImage(key: string, url: string | null): void {
    if (imageCache.size >= IMAGE_CACHE_MAX) {
      const oldest = imageCache.keys().next().value;
      if (oldest !== undefined) imageCache.delete(oldest);
    }
    imageCache.set(key, url);
  }
</script>

<script lang="ts">
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import AdminStatusBadge from './AdminStatusBadge.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import type { AdminUnifiedProduct, AdminProductType } from '../types';
  import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
  import { gnosisConfig } from '$lib/shared/config/circles';
  import { getProduct, pickProductImageUrl } from '$lib/areas/market/services';
  import { normalizeEvmAddress as normalizeAddress } from '@circles-market/sdk';

  interface Props {
    product: AdminUnifiedProduct;
    productType: AdminProductType;
    onSelect?: (product: AdminUnifiedProduct) => void;
    hideSeller?: boolean;
  }

  let { product, productType, onSelect, hideSeller = false }: Props = $props();

  const hasMapping = $derived(productType !== 'route');
  const routeEnabled = $derived(product.route?.enabled);
  const mappingEnabled = $derived(
    productType === 'odoo'
      ? product.odoo?.enabled
      : productType === 'codedispenser'
        ? product.code?.enabled
        : productType === 'unlock'
          ? product.unlock?.enabled
          : null
  );
  const revokedAt = $derived(
    productType === 'odoo'
      ? product.odoo?.revokedAt
      : productType === 'codedispenser'
        ? product.code?.revokedAt
        : productType === 'unlock'
          ? product.unlock?.revokedAt
          : null
  );
  const poolRemaining = $derived(
    productType === 'codedispenser' ? product.code?.poolRemaining : null
  );
  const odooLocalAvailableQty = $derived(
    productType === 'odoo' ? product.odoo?.localAvailableQty : null
  );
  const odooTotalInventory = $derived(
    productType === 'odoo' ? product.odoo?.totalInventory : null
  );
  const unlockTotalInventory = $derived(
    productType === 'unlock' ? product.unlock?.totalInventory : null
  );
  const hasInactiveMapping = $derived(
    mappingEnabled === false || !!revokedAt || routeEnabled === false
  );
  const needsAdapterLabel = $derived(productType === 'route' ? 'Needs adapter' : null);
  const typeVariant = $derived(
    hasInactiveMapping ? 'error' : productType === 'route' ? 'warning' : 'success'
  );

  let imageUrl = $state<string | null>(null);
  let imageAnchorEl = $state<HTMLElement | null>(null);
  let resolveStarted = false;

  function imageCacheKey(): { key: string; seller: string; sku: string } | null {
    const seller = normalizeAddress(String(product.seller));
    const sku = String(product.sku);
    if (!seller || !sku) return null;
    // Carry seller/sku alongside the composite key so the fetch never has to re-split the
    // string — a sku containing '|' would otherwise be truncated by `key.split('|')`.
    return { key: `${seller}|${sku}`, seller, sku };
  }

  async function resolveProductImage(): Promise<void> {
    const keyed = imageCacheKey();
    if (!keyed) {
      imageUrl = null;
      return;
    }
    const { key, seller, sku } = keyed;
    if (imageCache.has(key)) {
      imageUrl = imageCache.get(key) ?? null;
      return;
    }
    try {
      const catalog = getMarketClient().catalog.forOperator(String(gnosisConfig.production.marketOperator));
      const item = await catalog.fetchProductForSellerAndSku(seller, sku);
      const url = item ? pickProductImageUrl(getProduct(item)) : null;
      cacheImage(key, url);
      imageUrl = url;
    } catch {
      // Leave uncached so a transient failure can retry on a later mount.
      imageUrl = null;
    }
  }

  // Resolve the thumbnail lazily — only once the row scrolls near the viewport. This stops every
  // row across every (hidden) tab panel and every collapsed <details> group from firing a
  // paginating catalog lookup on mount, which was the storm that froze the admin page. The
  // observer runs once per row; the module-level cache then covers re-renders and sibling rows.
  $effect(() => {
    if (resolveStarted || !imageAnchorEl) return;
    resolveStarted = true;

    if (typeof IntersectionObserver === 'undefined') {
      void resolveProductImage();
      return;
    }

    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        io.disconnect();
        void resolveProductImage();
      }
    }, { rootMargin: '200px' });
    io.observe(imageAnchorEl);
    return () => io.disconnect();
  });
</script>

<RowFrame
  className="bg-base-100"
  dense={true}
  clickable={true}
  onclick={() => onSelect?.(product)}
>
  {#snippet leading()}
    <div bind:this={imageAnchorEl} class="w-10 h-10 rounded-md bg-base-200 overflow-hidden shrink-0 flex items-center justify-center">
      {#if imageUrl}
        <img src={imageUrl} alt="" class="w-10 h-10 object-cover" />
      {:else}
        <span class="text-[10px] opacity-60">No image</span>
      {/if}
    </div>
  {/snippet}

  {#snippet title()}
    {product.sku}
  {/snippet}

  {#snippet subtitle()}
    {#if !hideSeller}
      <div class="min-w-0">
        <Avatar address={product.seller} view="small" clickable={true} />
      </div>
    {/if}
  {/snippet}

  {#snippet meta()}
    Chain {product.chainId}
  {/snippet}

  {#snippet trailing()}
    <div class="flex items-center gap-2 flex-wrap justify-end">
      {#if needsAdapterLabel}
        <AdminStatusBadge
          label={needsAdapterLabel}
          variant={typeVariant}
        />
      {/if}
      {#if poolRemaining !== null && poolRemaining !== undefined}
        <AdminStatusBadge
          label={poolRemaining > 0 ? `${poolRemaining} left` : 'Empty'}
          variant={poolRemaining > 0 ? 'success' : 'warning'}
        />
      {/if}
      {#if productType === 'odoo'}
        <AdminStatusBadge
          label={
            odooLocalAvailableQty == null
              ? 'Local stock: fallback'
              : `Local stock: ${odooLocalAvailableQty}`
          }
          variant={odooLocalAvailableQty == null ? 'neutral' : odooLocalAvailableQty > 0 ? 'success' : 'warning'}
        />
        {#if odooTotalInventory != null}
          <AdminStatusBadge
            label={`Total: ${odooTotalInventory}`}
            variant="neutral"
          />
        {/if}
      {/if}
      {#if productType === 'unlock' && unlockTotalInventory != null}
        <AdminStatusBadge
          label={`Total: ${unlockTotalInventory}`}
          variant="neutral"
        />
      {/if}
      {#if !hasMapping}
        <AdminStatusBadge label="No mapping" variant="neutral" />
      {:else if hasInactiveMapping}
        <AdminStatusBadge label={revokedAt ? 'Revoked' : 'Disabled'} variant="warning" />
      {/if}
    </div>
  {/snippet}
</RowFrame>