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
  // Basic sanitization: lowercase, replace spaces with hyphens, remove special chars
  let baseSku = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-')       // Replace whitespace with hyphens
    .replace(/^-+|-+$/g, '');   // Remove leading/trailing hyphens

  // If result is empty (e.g., name was just special chars), use a fallback
  if (!baseSku) {
    baseSku = 'product';
  }

  // Limit length to max allowed by SKU regex validation (63 chars)
  if (baseSku.length > 63) {
    baseSku = baseSku.substring(0, 63);
    // Remove trailing hyphen if we cut it off
    if (baseSku.endsWith('-')) {
      baseSku = baseSku.slice(0, -1);
    }
  }

  // Check for collisions and add suffix if needed
  let finalSku = baseSku;
  let counter = 1;

  while (existingSkus.includes(finalSku)) {
    const suffix = `-${counter}`;
    
    // If adding the suffix would exceed length, truncate the base SKU
    if (baseSku.length + suffix.length > 63) {
      finalSku = baseSku.substring(0, 63 - suffix.length) + suffix;
    } else {
      finalSku = baseSku + suffix;
    }
    
    counter++;
    
    // Safety check to prevent infinite loops
    if (counter > 1000) {
      throw new Error('Could not generate unique SKU after 1000 attempts');
    }
  }

  return finalSku;
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
