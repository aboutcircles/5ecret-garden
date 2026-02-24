export function normalizeAddress(value) {
  if (!value) return null;
  const v = String(value).trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(v)) return null;
  return v.toLowerCase();
}

export function uniqueAddresses(values) {
  const out = [];
  const seen = new Set();
  for (const v of values || []) {
    const addr = normalizeAddress(v);
    if (!addr || seen.has(addr)) continue;
    seen.add(addr);
    out.push(addr);
  }
  return out;
}

export function extractCidFromAvatarInfo(row) {
  if (!row || typeof row !== 'object') return null;
  const candidates = [
    row.metadataCid,
    row.profileCid,
    row.cid,
    row.metadata?.cid,
    row.profile?.cid,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

export function extractAddressFromProfileRow(row) {
  if (!row || typeof row !== 'object') return null;
  const candidates = [row.address, row.owner, row.avatar, row.seller];
  for (const c of candidates) {
    const addr = normalizeAddress(c);
    if (addr) return addr;
  }
  return null;
}

export function extractCidFromProfileRow(row) {
  if (!row || typeof row !== 'object') return null;
  const candidates = [
    row.metadataCid,
    row.profileCid,
    row.cid,
    row.metadata?.cid,
    row.profile?.cid,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

export function splitIntoChunks(items, chunkSize) {
  const out = [];
  const size = Math.max(1, Number(chunkSize || 1));
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
