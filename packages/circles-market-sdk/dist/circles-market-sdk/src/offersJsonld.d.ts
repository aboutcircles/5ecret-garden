import type { MinimalOfferInput, MinimalProductInput } from './offersTypes';
export declare class CurrencyCodeError extends Error {
}
export declare class ObjectTooLargeError extends Error {
}
export declare class UrlValidationError extends Error {
}
/**
 * Public: Build a Product JSON-LD with a single Offer using Circles Market context.
 * Mirrors the logic of the app's buildProduct in circles-app/src/lib/offers/jsonld.ts.
 */
export declare function buildProduct(product: MinimalProductInput, offer: MinimalOfferInput): any;
//# sourceMappingURL=offersJsonld.d.ts.map