/**
 * Helper functions for offer creation
 */
import type { OfferDraft } from '$lib/flows/offer/types';
import type { SchemaOrgProductLite, SchemaOrgOfferLite } from '$lib/market/types';
import { normalizeProductImagesFromSchema } from '$lib/market/imageHelpers';

/**
 * Generate a SKU based on product name with collision detection
 * @param name The product name
 * @param existingSkus List of existing SKUs to avoid collisions
 * @returns A valid SKU string
 */
export function generateSku(name: string, existingSkus: string[] = []): string {
  // Normalize: lowercase, replace any non [a-z0-9] with '-', collapse dashes
  let base = String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // replace special characters with dashes
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes

  // Ensure starts with [a-z0-9]
  if (!base || !/^[a-z0-9]/.test(base)) {
    base = (base.match(/[a-z0-9].*$/)?.[0] ?? '').replace(/^-+/, '');
  }
  if (!base) base = 'product';

  // Append short random suffix to reduce collisions
  const rand = shortRandom(5);
  let candidate = `${base}-${rand}`;

  // Enforce max length 63 as per regex /^[a-z0-9][a-z0-9-_]{0,62}$/
  if (candidate.length > 63) {
    const maxBaseLen = 63 - (1 + rand.length); // hyphen + rand
    base = base.substring(0, Math.max(1, maxBaseLen)).replace(/-+$/g, '');
    candidate = `${base}-${rand}`;
  }

  // If somehow starts with '-' or '_' after truncation, prefix with 'p'
  if (!/^[a-z0-9]/.test(candidate)) {
    candidate = `p${candidate}`;
    if (candidate.length > 63) candidate = candidate.substring(0, 63);
  }

  // Avoid explicit collisions if a set is provided
  if (!existingSkus.includes(candidate)) return candidate;

  // Fallback: try numeric counters
  let counter = 1;
  while (existingSkus.includes(candidate)) {
    const suffix = `-${counter}`;
    const maxBase = 63 - suffix.length;
    const trimmed = candidate.substring(0, Math.max(1, maxBase));
    candidate = trimmed.replace(/-+$/g, '') + suffix;
    counter++;
    if (counter > 1000) break;
  }
  return candidate;
}

/**
 * Validate SKU format according to the app's requirements
 * @param sku The SKU to validate
 * @returns True if valid, false otherwise
 */
import { isValidSku as sdkIsValidSku } from '@circles-market/sdk';
export function isValidSku(sku: string): boolean {
  return sdkIsValidSku(sku);
}

/**
 * Create a short random lowercase string [a-z0-9]
 */
export function shortRandom(len = 5): string {
  // Using crypto if available
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const out: string[] = [];
  try {
    const bytes = new Uint8Array(len);
    // Prefer Web Crypto API in both browser and modern Node.js (which exposes webcrypto)
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      // Fallback: non-cryptographic RNG; acceptable for SKU collision avoidance
      for (let i = 0; i < len; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    for (let i = 0; i < len; i++) {
      out.push(alphabet[bytes[i] % alphabet.length]);
    }
  } catch {
    // Unsecure fallback
    for (let i = 0; i < len; i++) {
      const r = Math.floor(Math.random() * alphabet.length);
      out.push(alphabet[r]);
    }
  }
  return out.join('');
}

/**
 * Map a Schema.org Product + Offer into an OfferDraft used by the offer flow.
 */
export function productAndOfferToDraft(
  product: SchemaOrgProductLite,
  offer?: SchemaOrgOfferLite | null
): OfferDraft {
  const imagesRaw = normalizeProductImagesFromSchema(product);
  const hasImages = imagesRaw.length > 0;
  const primaryImage = hasImages ? imagesRaw[0] : undefined;

  const hasPrice = typeof offer?.price === 'number';
  const priceValue = hasPrice ? Number(offer!.price) : undefined;

  const hasCurrency = typeof offer?.priceCurrency === 'string' && offer!.priceCurrency.trim().length > 0;
  const priceCurrency = hasCurrency ? offer!.priceCurrency!.trim() : 'CRC';

  const offerHasRequiredSlots = Array.isArray((offer as any)?.requiredSlots);
  const requiredSlots = offerHasRequiredSlots
    ? ((offer as any).requiredSlots as unknown[])
        .map((slot) => (typeof slot === 'string' ? slot.trim() : ''))
        .filter((slot) => slot.length > 0)
    : undefined;

  const draft: OfferDraft = {
    sku: String(product.sku || ''),
    name: String(product.name || ''),
    description: (product.description || undefined) as string | undefined,
    image: primaryImage,
    images: hasImages ? imagesRaw : undefined,
    url: (product.url || undefined) as string | undefined,
    brand: (product.brand || undefined) as string | undefined,
    mpn: (product.mpn || undefined) as string | undefined,
    gtin13: (product.gtin13 || undefined) as string | undefined,
    category: (product.category || undefined) as string | undefined,
    price: priceValue,
    priceCurrency,
    availableDeliveryMethod: (offer?.availableDeliveryMethod || undefined) as string | undefined,
    requiredSlots,
    paymentGateway: undefined
  };

  return draft;
}
