/**
 * Helper functions for offer creation
 */
import type { OfferDraft } from '$lib/areas/market/flows/offer/types';
import type { SchemaOrgProductLite, SchemaOrgOfferLite } from '$lib/areas/market/model';
import { normalizeProductImagesFromSchema } from '$lib/areas/market/services';
import { isValidSku as sdkIsValidSku } from '@circles-market/sdk';

export function generateSku(name: string, existingSkus: string[] = []): string {
  let base = String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!base || !/^[a-z0-9]/.test(base)) {
    base = (base.match(/[a-z0-9].*$/)?.[0] ?? '').replace(/^-+/, '');
  }
  if (!base) base = 'product';

  const rand = shortRandom(5);
  let candidate = `${base}-${rand}`;

  if (candidate.length > 63) {
    const maxBaseLen = 63 - (1 + rand.length);
    base = base.substring(0, Math.max(1, maxBaseLen)).replace(/-+$/g, '');
    candidate = `${base}-${rand}`;
  }

  if (!/^[a-z0-9]/.test(candidate)) {
    candidate = `p${candidate}`;
    if (candidate.length > 63) candidate = candidate.substring(0, 63);
  }

  if (!existingSkus.includes(candidate)) return candidate;

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

export function isValidSku(sku: string): boolean {
  return sdkIsValidSku(sku);
}

export function shortRandom(len = 5): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const out: string[] = [];
  try {
    const bytes = new Uint8Array(len);
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < len; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    for (let i = 0; i < len; i++) {
      out.push(alphabet[bytes[i] % alphabet.length]);
    }
  } catch {
    for (let i = 0; i < len; i++) {
      const r = Math.floor(Math.random() * alphabet.length);
      out.push(alphabet[r]);
    }
  }
  return out.join('');
}

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

  const offerHasRequiredSlots = Array.isArray(offer?.requiredSlots);
  const requiredSlots = offerHasRequiredSlots
    ? offer!.requiredSlots!
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
