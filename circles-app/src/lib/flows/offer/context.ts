// Deprecated legacy context for the old offer flow.
// Keep as a thin compatibility layer to avoid accidental imports breaking the build.
// New flow uses ./types and the components 1_Product -> 2_Pricing -> 3_PreviewPublish.

export type { OfferFlowContext, OfferDraft, Address } from './types';

// Legacy helpers are no longer supported. If anything calls them, fail loudly.
export const SKU_REGEX = /^[a-z0-9][a-z0-9-_]{0,62}$/;

export function parseImages(): never { throw new Error('Deprecated: use new flow.'); }
export function isIsoUtc(): never { throw new Error('Deprecated: use new flow.'); }
export function isUri(): never { throw new Error('Deprecated: use new flow.'); }
export function validationErrors(): never { throw new Error('Deprecated: use new flow.'); }
export function buildProductJson(): never { throw new Error('Deprecated: use new flow.'); }
export function pretty(): never { throw new Error('Deprecated: use new flow.'); }
