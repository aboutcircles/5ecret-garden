import { ObjectTooLargeError, InvalidUriError, CurrencyCodeError } from './errors';
import type { Address } from './adapters';
import { isAbsoluteUri } from './adapters';

export type ProductImage =
  | string
  | { "@type": "ImageObject"; contentUrl?: string; url?: string };

export type MinimalProduct = {
  sku: string;
  name: string;
  description?: string;
  image?: ProductImage | ProductImage[];
  url?: string;
  brand?: string;
  mpn?: string;
  gtin13?: string;
  category?: string;
};

export type MinimalOffer = {
  price: number;
  priceCurrency: string; // ISO-4217 (A–Z{3})
  checkout: string; // absolute URI
  availability?: string; // schema IRI
  availabilityFeed?: string; // URI
  inventoryFeed?: string; // URI
  url?: string;
  sellerName?: string;
};

const SIZE_LIMIT = 8 * 1024 * 1024; // 8 MiB

function ensureAbsoluteUri(field: string, s?: string) {
  if (s == null) return;
  if (!isAbsoluteUri(s)) throw new InvalidUriError(field, s);
}

function validateCurrency(code: string) {
  if (!/^[A-Z]{3}$/.test(code)) throw new CurrencyCodeError(code);
}

function normalizeImages(image?: ProductImage | ProductImage[]) {
  if (image == null) return undefined;
  const normalizeOne = (img: ProductImage) => {
    if (typeof img === 'string') {
      if (!isAbsoluteUri(img)) throw new InvalidUriError('image', img);
      return img;
    }
    if (img && img['@type'] === 'ImageObject') {
      const { contentUrl, url } = img as any;
      if (!contentUrl && !url) throw new InvalidUriError('image', 'missing contentUrl/url');
      if (contentUrl) ensureAbsoluteUri('image.contentUrl', contentUrl);
      if (url) ensureAbsoluteUri('image.url', url);
      const out: any = { '@type': 'ImageObject' };
      if (contentUrl) out.contentUrl = contentUrl;
      if (url) out.url = url;
      return out;
    }
    throw new InvalidUriError('image', 'invalid object');
  };
  return Array.isArray(image) ? image.map(normalizeOne) : normalizeOne(image);
}

export function buildProduct(product: MinimalProduct, offer: MinimalOffer): any {
  // Validate offer fields
  if (!(offer.price > 0)) throw new Error('price must be > 0');
  validateCurrency(offer.priceCurrency);
  ensureAbsoluteUri('offer.checkout', offer.checkout);
  ensureAbsoluteUri('offer.availability', offer.availability);
  ensureAbsoluteUri('offer.availabilityFeed', offer.availabilityFeed);
  ensureAbsoluteUri('offer.inventoryFeed', offer.inventoryFeed);
  ensureAbsoluteUri('offer.url', offer.url);

  // Validate product URL if present
  ensureAbsoluteUri('product.url', product.url);

  const images = normalizeImages(product.image);

  const obj: any = {
    '@context': ['https://schema.org/', 'https://aboutcircles.com/contexts/circles-market/'],
    '@type': 'Product',
    sku: product.sku,
    name: product.name,
  };
  if (product.description) obj.description = product.description;
  if (images) obj.image = images;
  if (product.url) obj.url = product.url;
  if (product.brand) obj.brand = product.brand;
  if (product.mpn) obj.mpn = product.mpn;
  if (product.gtin13) obj.gtin13 = product.gtin13;
  if (product.category) obj.category = product.category;

  const offerObj: any = {
    '@type': 'Offer',
    price: offer.price,
    priceCurrency: offer.priceCurrency,
    checkout: offer.checkout,
  };
  if (offer.availability) offerObj.availability = offer.availability;
  if (offer.availabilityFeed) offerObj.availabilityFeed = offer.availabilityFeed;
  if (offer.inventoryFeed) offerObj.inventoryFeed = offer.inventoryFeed;
  if (offer.url) offerObj.url = offer.url;
  if (offer.sellerName) {
    offerObj.seller = { '@type': 'Organization', name: offer.sellerName };
  }

  obj.offers = [offerObj];

  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  if (bytes.length > SIZE_LIMIT) throw new ObjectTooLargeError(bytes.length, SIZE_LIMIT);
  return obj;
}

export async function buildLinkDraft(
  name: string,
  cid: string,
  chainId: number,
  signerAddress: Address,
  nowSec: number
) {
  const nonceBytes = await cryptoGetRandomValues(16);
  let nonce = '0x';
  for (const b of nonceBytes) nonce += b.toString(16).padStart(2, '0');
  return {
    '@context': 'https://aboutcircles.com/contexts/circles-linking/',
    '@type': 'CustomDataLink',
    name,
    cid,
    encrypted: false,
    chainId,
    signerAddress,
    signedAt: nowSec,
    nonce,
    signature: '',
  };
}

async function cryptoGetRandomValues(n: number): Promise<Uint8Array> {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    return globalThis.crypto.getRandomValues(new Uint8Array(n));
  }
  try {
    // Node.js
    const { randomBytes } = await import('node:crypto');
    return new Uint8Array(randomBytes(n));
  } catch {
    throw new Error('No secure RNG available for nonce generation');
  }
}
