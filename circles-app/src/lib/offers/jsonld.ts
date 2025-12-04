import { ObjectTooLargeError, InvalidUriError, CurrencyCodeError } from './errors';
import type { Address, Hex } from '../safeSigner/types';
import { isAbsoluteUri } from './adapters';

export type CustomDataLink = {
  '@context': 'https://aboutcircles.com/contexts/circles-linking/';
  '@type': 'CustomDataLink';

  name: string;
  cid: string;

  encrypted: boolean;
  encryptionAlgorithm: string | null;
  encryptionKeyFingerprint: string | null;

  chainId: number;
  signerAddress: Address;
  signedAt: number;   // unixSeconds
  nonce: Hex;         // 0x + 32 hex chars
  signature: Hex | ''; // empty string before signing, Hex afterwards
};

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
  availabilityFeed?: string; // URI
  inventoryFeed?: string; // URI
  url?: string;
  availableDeliveryMethod?: string; // GoodRelations IRI
  /**
   * Offer-driven basket requirements. Array of opaque slot keys.
   * Server recognizes an initial set (e.g., "contactPoint.email", "contactPoint.telephone").
   */
  requiredSlots?: string[];
};

const SIZE_LIMIT = 8 * 1024 * 1024; // 8 MiB

function ensureAbsoluteUri(field: string, s?: string) {
  if (s == null) return;
  if (!isAbsoluteUri(s)) throw new InvalidUriError(field, s);
}

function validateCurrency(code: string) {
  if (!/^[A-Z]{3}$/.test(code)) throw new CurrencyCodeError(code);
}

function normalizeImagesToArray(image?: ProductImage | ProductImage[]) {
  if (image == null) {
    return undefined;
  }

  const normalizeOne = (img: ProductImage) => {
    if (typeof img === 'string') {
      ensureAbsoluteUri('image', img);
      return img;
    }

    if (img && (img as any)['@type'] === 'ImageObject') {
      const { contentUrl, url } = img as any;
      const hasContentUrl = typeof contentUrl === 'string' && contentUrl.length > 0;
      const hasUrl = typeof url === 'string' && url.length > 0;

      if (!hasContentUrl && !hasUrl) {
        throw new InvalidUriError('image', 'missing contentUrl/url');
      }
      if (hasContentUrl) {
        ensureAbsoluteUri('image.contentUrl', contentUrl);
      }
      if (hasUrl) {
        ensureAbsoluteUri('image.url', url);
      }

      const out: any = { '@type': 'ImageObject' };
      if (hasContentUrl) { out.contentUrl = contentUrl; }
      if (hasUrl) { out.url = url; }
      return out;
    }

    throw new InvalidUriError('image', 'invalid object');
  };

  return Array.isArray(image) ? image.map(normalizeOne) : [normalizeOne(image)];
}

export function buildProduct(product: MinimalProduct, offer: MinimalOffer): any {
  // Validate offer fields
  if (!(offer.price > 0)) throw new Error('price must be > 0');
  validateCurrency(offer.priceCurrency);
  ensureAbsoluteUri('offer.availabilityFeed', offer.availabilityFeed);
  ensureAbsoluteUri('offer.inventoryFeed', offer.inventoryFeed);
  ensureAbsoluteUri('offer.url', offer.url);

  // Validate product URL if present
  ensureAbsoluteUri('product.url', product.url);

  const images = normalizeImagesToArray(product.image);

  const obj: any = {
    '@context': ['https://schema.org/', 'https://aboutcircles.com/contexts/circles-market/'],
    '@type': 'Product',
    sku: product.sku,
    name: product.name,
  };
  if (product.description) obj.description = product.description;
  if (images && images.length > 0) obj.image = images; // server requires array
  if (product.url) obj.url = product.url;
  if (product.brand) obj.brand = product.brand;
  if (product.mpn) obj.mpn = product.mpn;
  if (product.gtin13) obj.gtin13 = product.gtin13;
  if (product.category) obj.category = product.category;

  const offerObj: any = {
    '@type': 'Offer',
    price: offer.price,
    priceCurrency: offer.priceCurrency,
  };
  if (offer.availabilityFeed) offerObj.availabilityFeed = offer.availabilityFeed;
  if (offer.inventoryFeed) offerObj.inventoryFeed = offer.inventoryFeed;
  if (offer.url) offerObj.url = offer.url;
  if (offer.availableDeliveryMethod) offerObj.availableDeliveryMethod = offer.availableDeliveryMethod;
  if (Array.isArray((offer as any).requiredSlots)) {
    const slots = (offer as any).requiredSlots as unknown[];
    const filtered = slots
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s) => s.length > 0);
    if (filtered.length > 0) {
      offerObj.requiredSlots = filtered;
    }
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
): Promise<CustomDataLink> {
  const nonceBytes = await cryptoGetRandomValues(16);

  let nonce = '0x';
  for (const b of nonceBytes) {
    nonce += b.toString(16).padStart(2, '0');
  }

  const link: CustomDataLink = {
    '@context': 'https://aboutcircles.com/contexts/circles-linking/',
    '@type': 'CustomDataLink',
    name,
    cid,
    encrypted: false,
    encryptionAlgorithm: null,
    encryptionKeyFingerprint: null,
    chainId,
    signerAddress,
    signedAt: nowSec,
    nonce: nonce as Hex,
    signature: '', // populated after Safe signs
  };

  return link;
}

async function cryptoGetRandomValues(n: number): Promise<Uint8Array> {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    return globalThis.crypto.getRandomValues(new Uint8Array(n));
  }
  // No Node-specific fallback: require a standards-compliant Web Crypto API
  // to avoid bundling or referencing Node-only modules in client code.
  throw new Error('No secure RNG available for nonce generation');
}
