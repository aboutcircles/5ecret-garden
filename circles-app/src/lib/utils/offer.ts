/**
 * Helper functions for offer creation
 */

import type { OfferDraft } from '$lib/flows/offer/types';

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
export function isValidSku(sku: string): boolean {
  // Regex from 1_Product.svelte: /^[a-z0-9][a-z0-9-_]{0,62}$/
  return /^[a-z0-9][a-z0-9-_]{0,62}$/.test(sku);
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
 * Create an initial OfferDraft with sensible defaults
 * @param name Product name
 * @param existingSkus Existing SKUs to avoid collisions
 * @returns Partial OfferDraft with generated SKU and name
 */
export function createInitialOfferDraft(
  name: string, 
  existingSkus: string[] = []
): Partial<OfferDraft> {
  return {
    sku: generateSku(name, existingSkus),
    name,
  };
}
