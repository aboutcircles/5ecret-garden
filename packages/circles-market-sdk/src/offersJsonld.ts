import type { MinimalOfferInput, MinimalProductInput } from './offersTypes';

export class CurrencyCodeError extends Error {}
export class ObjectTooLargeError extends Error {}
export class UrlValidationError extends Error {}

const CONTEXT = [
  'https://schema.org/',
  'https://aboutcircles.com/contexts/circles-market/',
] as const;

// moved to utils.ts
import { isAbsoluteUri } from './utils';

function normalizeImages(img: unknown): any[] | undefined {
  if (img == null) return undefined;
  const out: any[] = [];
  const pushStr = (s: string) => {
    if (!isAbsoluteUri(s)) throw new UrlValidationError('image must be absolute URL');
    out.push(s);
  };
  const pushObj = (o: any) => {
    const obj: any = { '@type': 'ImageObject' };
    if (o.contentUrl != null) {
      if (!isAbsoluteUri(o.contentUrl)) throw new UrlValidationError('image.contentUrl must be absolute URL');
      obj.contentUrl = o.contentUrl;
    }
    if (o.url != null) {
      if (!isAbsoluteUri(o.url)) throw new UrlValidationError('image.url must be absolute URL');
      obj.url = o.url;
    }
    out.push(obj);
  };
  if (typeof img === 'string') {
    pushStr(img);
  } else if (Array.isArray(img)) {
    for (const it of img) {
      if (typeof it === 'string') pushStr(it);
      else if (it && typeof it === 'object') pushObj(it);
      else throw new UrlValidationError('Invalid image element');
    }
  } else if (typeof img === 'object') {
    pushObj(img);
  } else {
    throw new UrlValidationError('Invalid image');
  }
  return out;
}

function enforceSizeCap(obj: any) {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  const cap = 8 * 1024 * 1024; // 8 MiB
  if (bytes.length > cap) throw new ObjectTooLargeError('JSON-LD exceeds 8 MiB cap');
}

/**
 * Public: Build a Product JSON-LD with a single Offer using Circles Market context.
 * Mirrors the logic of the app's buildProduct in circles-app/src/lib/offers/jsonld.ts.
 */
export function buildProduct(product: MinimalProductInput, offer: MinimalOfferInput): any {
  if (typeof offer.price !== 'number' || !(offer.price > 0)) {
    throw new Error('offer.price must be > 0');
  }
  if (typeof offer.priceCurrency !== 'string' || !/^[A-Z]{3}$/.test(offer.priceCurrency)) {
    throw new CurrencyCodeError('priceCurrency must be 3 upper-case letters');
  }

  // Validate URL-ish fields
  if (offer.availabilityFeed && !isAbsoluteUri(offer.availabilityFeed)) throw new UrlValidationError('availabilityFeed must be absolute URL');
  if (offer.inventoryFeed && !isAbsoluteUri(offer.inventoryFeed)) throw new UrlValidationError('inventoryFeed must be absolute URL');
  if (offer.fulfillmentEndpoint && !isAbsoluteUri(offer.fulfillmentEndpoint)) throw new UrlValidationError('fulfillmentEndpoint must be absolute URL');
  if (offer.url && !isAbsoluteUri(offer.url)) throw new UrlValidationError('offer.url must be absolute URL');

  if (product.url && !isAbsoluteUri(product.url)) throw new UrlValidationError('product.url must be absolute URL');

  const imageArr = normalizeImages((product as any).image);

  const offerObj: any = {
    '@type': 'Offer',
    price: offer.price,
    priceCurrency: offer.priceCurrency,
  };
  if (offer.availabilityFeed) offerObj.availabilityFeed = offer.availabilityFeed;
  if (offer.inventoryFeed) offerObj.inventoryFeed = offer.inventoryFeed;
  if (offer.url) offerObj.url = offer.url;
  if (offer.availableDeliveryMethod) offerObj.availableDeliveryMethod = offer.availableDeliveryMethod;
  if (offer.requiredSlots) offerObj.requiredSlots = offer.requiredSlots;
  if (offer.fulfillmentEndpoint) offerObj.fulfillmentEndpoint = offer.fulfillmentEndpoint;
  if (offer.fulfillmentTrigger) offerObj.fulfillmentTrigger = offer.fulfillmentTrigger;

  const obj: any = {
    '@context': [...CONTEXT],
    '@type': 'Product',
    sku: product.sku,
    name: product.name,
    offers: [offerObj],
  };
  if (product.description) obj.description = product.description;
  if (imageArr && imageArr.length) obj.image = imageArr;
  if (product.url) obj.url = product.url;
  if (product.brand) obj.brand = product.brand;
  if (product.mpn) obj.mpn = product.mpn;
  if (product.gtin13) obj.gtin13 = product.gtin13;
  if (product.category) obj.category = product.category;

  enforceSizeCap(obj);
  return obj;
}
