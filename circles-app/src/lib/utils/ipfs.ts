/**
 * IPFS helpers for building gateway URLs consistently across the app.
 */

/**
 * Single source of truth for the public IPFS gateway base.
 * Change this to switch gateways app‑wide.
 */
export const ipfsGatewayBase = 'https://ipfs.io';

/**
 * Build a public gateway URL for a given CID (defaults to ipfs.io).
 * Throws if cid is empty.
 */
export function ipfsGatewayUrl(cid: string): string {
  const c = String(cid ?? '').trim();
  if (!c) throw new Error('CID required');
  return `${ipfsGatewayBase}/ipfs/${c}`;
}
