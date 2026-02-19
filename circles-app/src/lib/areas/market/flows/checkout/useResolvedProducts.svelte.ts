import { getMarketClient } from '$lib/shared/data/market/marketClientProxy';
import type { AggregatedCatalogItem } from '$lib/areas/market/model';
import { pickFirstProductImageUrl } from '$lib/areas/market/services';
import { gnosisMarketConfig } from '$lib/shared/config/market';

type ProductKey = string;

function productKey(seller: string | undefined, sku: string | undefined): ProductKey | null {
  if (!seller || !sku) return null;
  return `${seller.toLowerCase()}::${sku.toLowerCase()}`;
}

// Module-level cache so multiple callers (e.g. Cart + Review) reuse already-resolved items.
export let resolvedProductsCache: Record<ProductKey, AggregatedCatalogItem | null> = $state({});
const resolvingKeys: Set<ProductKey> = new Set();

export function resetResolvedProductsCache(): void {
  for (const key of Object.keys(resolvedProductsCache)) {
    delete resolvedProductsCache[key];
  }
  resolvingKeys.clear();
}

export function useResolvedProducts(lines: any[]): {
  findCatalogItem: (seller: string | undefined, sku: string | undefined) => AggregatedCatalogItem | undefined;
  imageUrlForLine: (line: any) => string | null;
  resolvedProducts: Record<string, AggregatedCatalogItem | null>;
} {
  function findCatalogItem(
    seller: string | undefined,
    sku: string | undefined,
  ): AggregatedCatalogItem | undefined {
    const key = productKey(seller, sku);
    if (!key) return undefined;
    const entry = resolvedProductsCache[key];
    return entry ?? undefined;
  }

  // Prefer line-local image if present (server snapshot), else fall back to catalog
  function imageUrlForLine(line: any): string | null {
    const direct = typeof line?.imageUrl === 'string' ? line.imageUrl.trim() : '';
    if (direct) return direct;

    const item = findCatalogItem(
      line?.seller as string | undefined,
      line?.orderedItem?.sku as string | undefined,
    );
    if (!item) return null;

    return pickFirstProductImageUrl(item.product);
  }

  $effect(() => {
    const operator = gnosisMarketConfig.marketOperator;
    if (!operator) return;

    const catalog = getMarketClient().catalog.forOperator(operator);
    for (const line of lines) {
      const seller = line?.seller as string | undefined;
      const sku = line?.orderedItem?.sku as string | undefined;
      const key = productKey(seller, sku);
      if (!key) continue;

      const alreadyKnown = Object.prototype.hasOwnProperty.call(resolvedProductsCache, key);
      const alreadyResolving = resolvingKeys.has(key);
      if (alreadyKnown || alreadyResolving) continue;

      resolvingKeys.add(key);
      resolvedProductsCache[key] = null;

      void (async () => {
        try {
          const item = await catalog.fetchProductForSellerAndSku(seller as string, sku as string);
          resolvedProductsCache[key] = item;
        } catch (e) {
          console.debug('[checkout] failed to resolve product from catalog', { seller, sku }, e);
          resolvedProductsCache[key] = null;
        } finally {
          resolvingKeys.delete(key);
        }
      })();
    }
  });

  return { findCatalogItem, imageUrlForLine, resolvedProducts: resolvedProductsCache };
}
