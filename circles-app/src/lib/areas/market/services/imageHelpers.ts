// src/lib/market/imageHelpers.ts
// Central helpers to normalize product images from various schema-like shapes.

export function normalizeProductImagesFromSchema(prod: any): string[] {
  if (!prod) return [];

  const urls: string[] = [];

  const primary: any = (prod as any)?.image ?? (prod as any)?.images ?? null;

  const push = (u: unknown) => {
    if (typeof u === 'string') {
      const t = u.trim();
      if (t.length > 0) urls.push(t);
    }
  };

  const extractFromObject = (img: any) => {
    if (!img || typeof img !== 'object') return;
    push(img.url);
    push(img.Url);
    push(img.contentUrl);
    push(img.object?.contentUrl);
    push(img.Object?.ContentUrl);
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
    extractFromObject(primary);
  }

  // Fallbacks – some backends use imageUrl / ImageUrl
  if (urls.length === 0) {
    push((prod as any)?.imageUrl);
    push((prod as any)?.ImageUrl);
  }

  // De-duplicate while preserving order
  const seen = new Set<string>();
  return urls.filter((u) => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });
}

export function pickFirstProductImageUrl(prod: any): string | null {
  const imgs = normalizeProductImagesFromSchema(prod);
  return imgs[0] ?? null;
}
