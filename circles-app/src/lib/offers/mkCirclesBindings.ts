import type { Sdk } from '@circles-sdk/sdk';
import type { Address } from '@circles-sdk/utils';
import type { CidV0 } from '$lib/offers/cid';
import type { ProfilesBindings } from '@circles-market/sdk';
import { ipfsGatewayUrl } from '$lib/utils/ipfs';

export interface AppProfilesBindings extends ProfilesBindings {
  pinMediaBytes: (bytes: Uint8Array, mime?: string | null) => Promise<string>;
  gatewayUrlForCid: (cid: string) => string;
}

export function mkCirclesBindings(
  pinApiBase: string | undefined,
  circlesSdk: Sdk,
): AppProfilesBindings { 
  if (!circlesSdk) throw new Error('Circles SDK not initialized');
  if (!circlesSdk.profiles) throw new Error('Profiles service not configured');

  const base = (pinApiBase ?? '').replace(/\/$/, '');
  const pinUrl = base ? `${base}/api/pin` : '';
  const pinMediaUrl = base ? `${base}/api/pin-media` : '';

  function assertCidV0(v: unknown): CidV0 {
    if (typeof v !== 'string') {
      throw new Error(`Pin API returned invalid cid: ${String(v)}`);
    }
    const cid = v.trim();
    const ok = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid);
    if (!ok) {
      throw new Error(`Pin API returned invalid cid: ${String(v)}`);
    }
    return cid as CidV0;
  }

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
    return assertCidV0(body?.cid);
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
      body: bytes as Uint8Array<ArrayBuffer>
    });
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      throw new Error(`Pin API error ${res.status}: ${detail || res.statusText}`);
    }
    const body = await res.json().catch(() => ({} as any));
    return assertCidV0(body?.cid);
  }

  function gatewayUrlForCid(cid: string): string {
    return ipfsGatewayUrl(cid);
  }

  async function getJsonLd(cid: string): Promise<any> {
    // Fetch generic JSON-LD by CID. Do not use circlesSdk.profiles.get here because it only
    // understands profile documents and may return empty objects for namespace/index chunks.
    const url = ipfsGatewayUrl(cid);
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, application/ld+json' },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch IPFS JSON: ${res.status} ${res.statusText}`);
    }

    return await res.json();
  }

  return {
    async getLatestProfileCid(av: Address): Promise<string | null> {
      const cid = await circlesSdk.data.getMetadataCidForAddress(av);
      return (cid as string | null) ?? null;
    },
    putJsonLd,
    getJsonLd,
    async updateAvatarProfileDigest(av: Address, cid: string): Promise<string> {
      const avatarObj = await circlesSdk.getAvatar(av);
      const tx = await avatarObj.updateMetadata(cid);
      return ((tx as any)?.hash ?? '') as string;
    },
    // extras
    pinMediaBytes,
    gatewayUrlForCid,
  };
}
