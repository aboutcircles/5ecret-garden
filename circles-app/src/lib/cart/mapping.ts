// src/lib/cart/mapping.ts
import type { Address } from '@circles-sdk/utils';
import type { AggregatedCatalogItem } from '$lib/market/types';
import type { OrderItemPreview } from './types';

/**
 * Given an AggregatedCatalogItem and a quantity, build a basket OrderItemPreview.
 * Uses the first offer on the product for now.
 */
export function catalogItemToOrderItem(
  item: AggregatedCatalogItem,
  quantity: number,
): OrderItemPreview {
  const prod = item.product;
  const offers = Array.isArray(prod.offers) ? prod.offers : [];
  const primaryOffer = offers[0];

  if (!primaryOffer) {
    throw new Error('Product has no offers; cannot add to basket');
  }

  if (!(quantity > 0)) {
    throw new Error('orderQuantity must be > 0');
  }

  const sellerAddr = item.seller.toLowerCase() as Address;

  const line: OrderItemPreview = {
    '@type': 'OrderItem',
    orderQuantity: quantity,
    orderedItem: {
      '@type': 'Product',
      sku: prod.sku,
    },
    seller: sellerAddr,
    productCid: item.productCid,
    // Do NOT include offerSnapshot in outbound payloads; server will resolve
    // canonical offer data based on (chainId, seller, sku) and populate it
    // in responses. Leaving this undefined keeps PATCH payloads reference-only.
  };

  return line;
}
