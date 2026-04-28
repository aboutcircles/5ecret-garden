// src/lib/market/imageHelpers.ts
// Central helpers to normalize product images from various schema-like shapes.

import type { SchemaOrgProductLite } from '$lib/areas/market/model';

export function normalizeProductImagesFromSchema(prod: SchemaOrgProductLite | null | undefined): string[] {
  if (!prod) return [];

  const urls: string[] = [];

  const primary: unknown = prod.image ?? null;

  const push = (u: unknown) => {
    if (typeof u === 'string') {
      const t = u.trim();
      if (t.length > 0) urls.push(t);
    }
  };

  const extractFromObject = (img: Record<string, unknown>) => {
    if (!img || typeof img !== 'object') return;
    push(img.url);
    push(img.Url);
    push(img.contentUrl);
    const nested = img.object as Record<string, unknown> | undefined;
    const nestedCap = img.Object as Record<string, unknown> | undefined;
    push(nested?.contentUrl);
    push(nestedCap?.ContentUrl);
  };

  if (typeof primary === 'string') {
    push(primary);
  } else if (Array.isArray(primary)) {
    for (const it of primary) {
      if (typeof it === 'string') {
        push(it);
      } else {
        extractFromObject(it);
      }
    }
  } else if (primary && typeof primary === 'object') {
    extractFromObject(primary as Record<string, unknown>);
  }

  // Fallbacks – some backends use imageUrl / ImageUrl
  if (urls.length === 0) {
    push(prod.imageUrl);
    push(prod.ImageUrl);
  }

  // De-duplicate while preserving order
  const seen = new Set<string>();
  return urls.filter((u) => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });
}

export function pickFirstProductImageUrl(prod: SchemaOrgProductLite | null | undefined): string | null {
  const imgs = normalizeProductImagesFromSchema(prod);
  return imgs[0] ?? null;
}
