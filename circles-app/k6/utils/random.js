export function randInt(min, max) {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

export function pickOne(items, fallback = null) {
  if (!Array.isArray(items) || items.length === 0) return fallback;
  return items[randInt(0, items.length - 1)];
}

export function pickDistinctPair(items) {
  if (!Array.isArray(items) || items.length === 0) return [null, null];
  if (items.length === 1) return [items[0], items[0]];
  const a = pickOne(items);
  let b = pickOne(items);
  let guard = 0;
  while (a === b && guard < 8) {
    b = pickOne(items);
    guard++;
  }
  return [a, b];
}

export function chance(probability) {
  if (!Number.isFinite(probability) || probability <= 0) return false;
  if (probability >= 1) return true;
  return Math.random() < probability;
}

export function weightedPick(entries) {
  // entries: [{ key, weight, enabled }]
  const enabled = (entries || []).filter((e) => e && e.enabled && e.weight > 0);
  if (enabled.length === 0) return null;
  const total = enabled.reduce((acc, e) => acc + e.weight, 0);
  let r = Math.random() * total;
  for (const e of enabled) {
    r -= e.weight;
    if (r <= 0) return e.key;
  }
  return enabled[enabled.length - 1].key;
}
