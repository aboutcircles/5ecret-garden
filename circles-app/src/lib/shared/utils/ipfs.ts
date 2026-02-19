/**
 * IPFS helpers for building gateway URLs consistently across the app.
 */
import {gnosisMarketConfig} from "$lib/shared/config/market";

/**
 * Build a public gateway URL for a given CID (defaults to ipfs.io).
 * Throws if cid is empty.
 */
export function ipfsGatewayUrl(cid: string): string {
  const c = String(cid ?? '').trim();
  if (!c) throw new Error('CID required');
  return `${gnosisMarketConfig.ipfsGatewayBase}/ipfs/${c}`;
}
