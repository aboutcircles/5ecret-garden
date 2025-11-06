import { avatarState } from '$lib/stores/avatar.svelte';

export const SKU_REGEX = /^[a-z0-9][a-z0-9-_]{0,62}$/;

export type OfferFlowContext = {
  // Product
  name?: string;
  description?: string;
  sku?: string;
  imagesInput?: string; // newline-separated URIs
  productUrl?: string;
  dateCreated?: string; // ISO UTC
  dateModified?: string; // ISO UTC
  // Offer
  price?: number | '';
  priceCurrency?: string;
  availabilityFeed?: string;
  inventoryFeed?: string;
  checkoutUrl?: string;
  priceValidUntil?: string; // ISO UTC
  offerDateModified?: string; // ISO UTC
  // Optional: seller display name (can come from profile)
  sellerName?: string;
};

export function parseImages(input: string | undefined): any[] {
  const lines = (input || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return lines.map((s) => s);
}

export function isIsoUtc(s: string | undefined): boolean {
  if (!s) return true; // optional
  return /Z$/.test(s) && !isNaN(Date.parse(s));
}

export function isUri(s: string | undefined): boolean {
  if (!s) return true;
  try {
    // Let URL throw for non-http schemes; accept custom schemes via regex fallback
    new URL(s);
    return true;
  } catch {
    return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s);
  }
}

export function validationErrors(ctx: OfferFlowContext): string[] {
  const errs: string[] = [];
  if (ctx.sku && !SKU_REGEX.test(ctx.sku)) errs.push('SKU must match ^[a-z0-9][a-z0-9-_]{0,62}$.');
  for (const u of parseImages(ctx.imagesInput)) {
    if (typeof u === 'string' && u.length === 0) errs.push('Image URL must not be empty.');
  }
  if (ctx.price !== '' && ctx.price != null && ctx.priceCurrency?.trim() === '') {
    errs.push('priceCurrency is required when price is set.');
  }
  const uriPairs: [string, string | undefined][] = [
    ['availabilityFeed', ctx.availabilityFeed],
    ['inventoryFeed', ctx.inventoryFeed],
    ['offer.url', ctx.checkoutUrl],
    ['product.url', ctx.productUrl],
  ];
  for (const [label, val] of uriPairs) {
    if (val && !isUri(val)) errs.push(`${label} must be a valid URI.`);
  }
  const timePairs: [string, string | undefined][] = [
    ['product.dateCreated', ctx.dateCreated],
    ['product.dateModified', ctx.dateModified],
    ['offer.priceValidUntil', ctx.priceValidUntil],
    ['offer.dateModified', ctx.offerDateModified],
  ];
  for (const [label, val] of timePairs) {
    if (val && !isIsoUtc(val)) errs.push(`${label} should be ISO-8601 UTC like 2024-08-22T10:00:00Z.`);
  }
  return errs;
}

export function buildProductJson(ctx: OfferFlowContext): any {
  const images = parseImages(ctx.imagesInput);
  const offer: any = { '@type': 'Offer' };
  if (ctx.price !== '' && ctx.price !== undefined && ctx.price !== null) offer.price = Number(ctx.price);
  if (ctx.priceCurrency) offer.priceCurrency = ctx.priceCurrency.trim();
  if (ctx.availabilityFeed) offer.availabilityFeed = ctx.availabilityFeed.trim();
  if (ctx.inventoryFeed) offer.inventoryFeed = ctx.inventoryFeed.trim();
  if (ctx.checkoutUrl) offer.url = ctx.checkoutUrl.trim();
  if (ctx.priceValidUntil) offer.priceValidUntil = ctx.priceValidUntil.trim();
  if (ctx.offerDateModified) offer.dateModified = ctx.offerDateModified.trim();

  const sellerAddr = avatarState.avatar?.address?.toLowerCase();
  if (sellerAddr) {
    offer.seller = {
      '@type': 'Organization',
      '@id': `eip155:100:${sellerAddr}`,
      ...(ctx.sellerName ? { name: ctx.sellerName.trim() } : {}),
    };
  }

  const product: any = {
    '@context': ['https://schema.org/', 'https://aboutcircles.com/contexts/circles-market/'],
    '@type': 'Product',
  };
  if (ctx.name) product.name = ctx.name.trim();
  if (ctx.description) product.description = ctx.description.trim();
  if (ctx.sku) product.sku = ctx.sku.trim();
  if (images.length) product.image = images;
  if (sellerAddr) product.offers = [offer];
  if (ctx.productUrl) product.url = ctx.productUrl.trim();
  if (ctx.dateCreated) product.dateCreated = ctx.dateCreated.trim();
  if (ctx.dateModified) product.dateModified = ctx.dateModified.trim();
  return product;
}

export function pretty(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return '';
  }
}
