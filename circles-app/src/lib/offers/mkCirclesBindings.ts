import type { Sdk } from '@circles-sdk/sdk';
import type { Address } from '@circles-sdk/utils';
import type { CidV0 } from '$lib/offers/cid';
import type { CirclesBindings as NamespacesBindings } from '$lib/offers/namespaces';
import { fetchIpfsJson } from '$lib/offers/namespaces';

// A Circles bindings shape compatible with both namespaces.ts and offers client
export type CirclesBindings = NamespacesBindings;

export function mkCirclesBindings(pinApiBase: string | undefined, circlesSdk: Sdk): CirclesBindings & {
  pinMediaBytes: (bytes: Uint8Array, mime?: string | null) => Promise<string>;
  gatewayUrlForCid: (cid: string) => string;
} {
  if (!circlesSdk) throw new Error('Circles SDK not initialized');
  if (!circlesSdk.profiles) throw new Error('Profiles service not configured');

  const base = (pinApiBase ?? '').replace(/\/$/, '');
  const pinUrl = base ? `${base}/api/pin` : '';
  const pinMediaUrl = base ? `${base}/api/pin-media` : '';
  const canonicalizeUrl = base ? `${base}/api/canonicalize` : '';

  async function putJsonLd(obj: any): Promise<CidV0> {
    if (!pinUrl) throw new Error('pinApiBase not provided; cannot call /api/pin');
    const res = await fetch(pinUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/ld+json; charset=utf-8',
        Accept: 'application/ld+json'
      },
      body: JSON.stringify(obj)
    });

    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      throw new Error(`Pin API error ${res.status}: ${detail || res.statusText}`);
    }

    const body = (await res.json().catch(() => ({} as any))) as any;
    const cid = body?.cid as string | undefined;
    const looksCidV0 = typeof cid === 'string' && /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid);
    if (!looksCidV0) {
      throw new Error(`Pin API returned invalid cid: ${String(cid)}`);
    }
    return cid as CidV0;
  }

  async function pinMediaBytes(bytes: Uint8Array, mime?: string | null): Promise<string> {
    if (!pinMediaUrl) throw new Error('pinApiBase not provided; cannot call /api/pin-media');
    const MAX = 8 * 1024 * 1024; // 8 MiB
    if (bytes.length > MAX) {
      throw new Error('Image too large: exceeds 8 MiB upload limit. Please upload a smaller image.');
    }
    const res = await fetch(pinMediaUrl, {
      method: 'POST',
      headers: { 'Content-Type': (mime || 'application/octet-stream'), 'Accept': 'application/json' },
      body: bytes
    });
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      throw new Error(`Pin API error ${res.status}: ${detail || res.statusText}`);
    }
    const body = await res.json().catch(() => ({} as any));
    const cid = body?.cid;
    const looksCidV0 = typeof cid === 'string' && /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid);
    if (!looksCidV0) throw new Error(`Pin API returned invalid cid: ${String(cid)}`);
    return cid;
  }

  function gatewayUrlForCid(cid: string): string {
    return `https://ipfs.io/ipfs/${cid}`;
  }

  async function getJsonLd(cid: string): Promise<any> {
    // Fetch generic JSON-LD by CID. Do not use profiles.get here because it only
    // understands profile documents and may return empty objects for namespace/index chunks,
    // which would cause namespace rewrites to drop previous entries.
    return await fetchIpfsJson(cid);
  }

  return {
    async getLatestProfileCid(av: Address): Promise<string | null> {
      const cid = await circlesSdk.data.getMetadataCidForAddress(av);
      return (cid as string | null) ?? null;
    },
    async getProfile(cid: CidV0): Promise<any | null> {
      try { return await circlesSdk.profiles!.get(cid); } catch { return null; }
    },
    putJsonLd,
    getJsonLd,
    async updateAvatarProfileDigest(av: Address, cid: string): Promise<string> {
      const avatarObj = await circlesSdk.getAvatar(av);
      const tx = await avatarObj.updateMetadata(cid);
      return ((tx as any)?.hash ?? '') as string;
    },
    async canonicalizeJsonLd(obj: any): Promise<string> {
      if (!canonicalizeUrl) throw new Error('pinApiBase not provided; cannot call /api/canonicalize');
      const res = await fetch(canonicalizeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/ld+json; charset=utf-8', Accept: 'text/plain' },
        body: JSON.stringify(obj)
      });
      if (!res.ok) {
        let detail = '';
        try { detail = await res.text(); } catch {}
        throw new Error(`Canonicalize API error ${res.status}: ${detail || res.statusText}`);
      }
      return await res.text();
    },
    // extras
    pinMediaBytes,
    gatewayUrlForCid,
  };
}
