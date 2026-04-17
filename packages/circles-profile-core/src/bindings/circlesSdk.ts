import type { ProfilesBindings, MediaBindings, Cid } from '../namespaces';
import type { Address } from '@aboutcircles/sdk-types';

/**
 * Structural interface for the subset of the Circles SDK used by the bindings.
 * Avoids nominal type mismatches when different package resolution paths
 * resolve to structurally-identical but nominally-distinct Sdk classes.
 */
export interface CirclesSdkLike {
  data: {
    getAvatar(address: Address): Promise<{ cidV0?: string } | null | undefined>;
  };
  getAvatar(
    address: Address,
    autoSubscribeEvents?: boolean,
  ): Promise<{
    profile: {
      updateMetadata(cid: string): Promise<{ transactionHash?: string; hash?: string } | null>;
    };
  }>;
}

function defaultGatewayUrlForCid(cid: string): string {
  // Align with fetchIpfsJson default gateway for consistency across packages
  return `https://da08cae2-8b50-45dc-80b9-48925be78ec8.myfilebase.com/ipfs/${cid}`;
}

function assertCidV0(v: unknown): string {
  if (typeof v !== 'string') {
    throw new Error(`Pin API returned invalid cid: ${String(v)}`);
  }
  const cid = v.trim();
  const ok = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid);
  if (!ok) {
    throw new Error(`Pin API returned invalid cid: ${String(v)}`);
  }
  return cid;
}

export function createCirclesSdkProfilesBindings(opts: {
  circlesSdk: CirclesSdkLike;
  pinApiBase?: string;
  gatewayUrlForCid?: (cid: string) => string;
  maxJsonBytes?: number;    // default 8 MiB
  maxMediaBytes?: number;   // default 8 MiB
}): { bindings: ProfilesBindings; media: MediaBindings } {
  const { circlesSdk } = opts;
  if (!circlesSdk) throw new Error('Circles SDK not initialized');
  if (!circlesSdk.data || typeof circlesSdk.getAvatar !== 'function') {
    throw new Error('Circles SDK bindings missing required services (data/getAvatar)');
  }

  const base = (opts.pinApiBase ?? '').replace(/\/$/, '');
  function endpointCandidates(path: 'pin' | 'pin-media' | 'raw'): string[] {
    if (!base) return [];
    return [`${base}/${path}`];
  }

  const pinUrls = endpointCandidates('pin');
  const pinMediaUrls = endpointCandidates('pin-media');
  const rawUrls = endpointCandidates('raw');
  const gateway = opts.gatewayUrlForCid ?? defaultGatewayUrlForCid;
  const MAX_JSON = opts.maxJsonBytes ?? 8 * 1024 * 1024;
  const MAX_MEDIA = opts.maxMediaBytes ?? 8 * 1024 * 1024;

  async function putJsonLd(obj: unknown): Promise<Cid> {
    if (pinUrls.length === 0) throw new Error('pinApiBase not provided; cannot call pin endpoint');
    const enc = new TextEncoder();
    const bytes = enc.encode(JSON.stringify(obj));
    if (bytes.length > MAX_JSON) {
      throw new Error('JSON-LD too large: exceeds upload limit');
    }
    let lastErr = '';
    for (const pinUrl of pinUrls) {
      const res = await fetch(pinUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/ld+json; charset=utf-8',
          Accept: 'application/ld+json'
        },
        body: bytes
      });

      if (res.ok) {
        const body = (await res.json().catch(() => ({} as any))) as any;
        return assertCidV0(body?.cid);
      }

      let detail = '';
      try { detail = await res.text(); } catch {}
      lastErr = `Pin API error ${res.status}: ${detail || res.statusText}`;

      // fallback to next candidate only when route likely mismatches
      if (res.status !== 404 && res.status !== 405) {
        break;
      }
    }
    throw new Error(lastErr || 'Pin API request failed');
  }

  async function getJsonLd(cid: Cid): Promise<unknown> {
    // Prefer pinning service /raw/:cid — centralizes IPFS reads behind the
    // service, benefits from its DB cache, and avoids hardcoded gateway URLs.
    // Falls back to direct IPFS gateway if pinning service is unavailable.
    //
    // Changed 2026-02-25: previously fetched directly from IPFS gateway only.
    // To revert to gateway-only: remove the rawUrls loop below.
    for (const rawUrl of rawUrls.map((u) => `${u}/${cid}`)) {
      try {
        const res = await fetch(rawUrl, {
          method: 'GET',
          headers: { Accept: 'application/json, application/ld+json' },
        });
        if (res.ok) {
          return await res.json();
        }
        // 404/405 = route mismatch, try next candidate
        if (res.status !== 404 && res.status !== 405) {
          break; // real error — skip to gateway fallback
        }
      } catch {
        // network error — try next candidate, then gateway fallback
      }
    }

    // Fallback: direct IPFS gateway fetch (original behavior).
    // Used when pinApiBase is not configured or pinning service is down.
    const url = gateway(cid);
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, application/ld+json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch IPFS JSON: ${res.status} ${res.statusText}`);
    }
    return await res.json();
  }

  async function pinMediaBytes(bytes: Uint8Array, mime?: string | null): Promise<Cid> {
    if (pinMediaUrls.length === 0) throw new Error('pinApiBase not provided; cannot call pin-media endpoint');
    if (bytes.length > MAX_MEDIA) {
      throw new Error('Image too large: exceeds 8 MiB upload limit. Please upload a smaller image.');
    }
    let lastErr = '';
    for (const pinMediaUrl of pinMediaUrls) {
      const res = await fetch(pinMediaUrl, {
        method: 'POST',
        headers: { 'Content-Type': (mime || 'application/octet-stream'), 'Accept': 'application/json' },
        body: bytes as Uint8Array<ArrayBuffer>
      });
      if (res.ok) {
        const body = await res.json().catch(() => ({} as any));
        return assertCidV0(body?.cid);
      }
      let detail = '';
      try { detail = await res.text(); } catch {}
      lastErr = `Pin API error ${res.status}: ${detail || res.statusText}`;
      if (res.status !== 404 && res.status !== 405) {
        break;
      }
    }
    throw new Error(lastErr || 'Pin media API request failed');
  }

  function gatewayUrlForCid(cid: string): string {
    return gateway(cid);
  }

  const bindings: ProfilesBindings = {
    async getLatestProfileCid(avatar: string): Promise<Cid | null> {
      // New SDK: sdk.data.getAvatar() returns AvatarInfo with cidV0 field
      const avatarInfo = await circlesSdk.data.getAvatar(avatar as Address);
      return avatarInfo?.cidV0 ?? null;
    },
    putJsonLd,
    getJsonLd,
    async updateAvatarProfileDigest(avatar: string, profileCid: Cid): Promise<string> {
      // Write-only metadata update path: avoid event subscription setup
      // to reduce websocket subscribe timeout risk.
      const avatarObj = await circlesSdk.getAvatar(avatar as Address, false);
      // New SDK: updateMetadata lives on avatar.profile
      const tx = await avatarObj.profile.updateMetadata(profileCid);
      return tx?.hash ?? '';
    },
  };

  const media: MediaBindings = { pinMediaBytes, gatewayUrlForCid };

  return { bindings, media };
}
