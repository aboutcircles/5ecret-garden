// circles-app/src/lib/offers/client.ts
import { cidV0ToDigest32, type CidV0, type Hex } from './cid';
import {
  OffersClientImpl,
  normalizeEvmAddress as normalizeAddress,
  type AvatarSigner,
  type MinimalProductInput,
  type MinimalOfferInput,
} from '@circles-market/sdk';
import type { ProfilesBindings } from '@circles-market/sdk';
import type { Address } from '@circles-sdk/utils';

export type { Hex, Address, CidV0 };
export type MinimalProduct = MinimalProductInput;
export type MinimalOffer = MinimalOfferInput;

export type AppendOfferParams = {
  avatar: Address;
  operator: Address;
  chainId?: number;
  product: MinimalProduct;
  offer: MinimalOffer;
  paymentGateway?: Address; // selected payment gateway address for PayAction
};

export type AppendOfferResult = {
  productCid: CidV0;
  linkCid?: CidV0;
  headCid: CidV0;
  indexCid: CidV0;
  profileCid: CidV0;
  /**
   * 32-byte digest derived from profileCid (not the product payload nor link).
   * Named for backwards-compat; callers should not assume it hashes the product.
   */
  digest32: Hex;
  txHash?: Hex;
};

export interface SafeSignerLike {
  sign(payload: Uint8Array | Hex): Promise<Hex>;
}

export interface ProfilesOffersClient {
  appendOffer(p: AppendOfferParams): Promise<AppendOfferResult>;

  tombstone(p: {
    avatar: Address;
    operator: Address;
    sku: string;
    chainId?: number;
  }): Promise<AppendOfferResult>;
}

function assertHex32(label: string, v: unknown): Hex {
  if (typeof v !== 'string') {
    throw new Error(`${label} must be a hex string`);
  }
  const s = v.toLowerCase();
  const ok = /^0x[0-9a-f]{64}$/.test(s);
  if (!ok) {
    throw new Error(`${label} must be 0x + 64 hex chars (got: ${String(v)})`);
  }
  return s as Hex;
}

function normalizeTxHash(v: unknown): Hex | undefined {
  if (v == null) return undefined;
  if (typeof v !== 'string') {
    throw new Error(`txHash must be a hex string (got: ${typeof v})`);
  }
  const s = v.trim().toLowerCase();
  if (s.length === 0) return undefined;
  if (!/^0x[0-9a-f]+$/.test(s)) {
    throw new Error(`txHash must be hex (got: ${v})`);
  }
  return s as Hex;
}

function toAvatarSigner(avatar: string, chainId: number, safe: SafeSignerLike): AvatarSigner {
  return {
    avatar: avatar.toLowerCase(),
    chainId: BigInt(chainId),
    async signBytes(payload: Uint8Array) {
      const sig = await safe.sign(payload);
      return sig as `0x${string}`;
    },
  };
}

export function createProfilesOffersClient(
  circles: ProfilesBindings,
  safe: SafeSignerLike,
): ProfilesOffersClient {
  const sdkOffers = new OffersClientImpl(circles);

  async function appendOffer(p: AppendOfferParams): Promise<AppendOfferResult> {
    const avatar = normalizeAddress(p.avatar);
    const operator = normalizeAddress(p.operator);
    const chainId = p.chainId ?? 100;

    const signer = toAvatarSigner(avatar, chainId, safe);
    const gateway = p.paymentGateway ? normalizeAddress(p.paymentGateway) : undefined;

    const res = await sdkOffers.publishOffer({
      avatar,
      operator,
      signer,
      chainId,
      paymentGateway: gateway,
      product: p.product,
      offer: p.offer,
    });

    const digest32 =
      res.digest32 != null
        ? assertHex32('digest32', res.digest32)
        : cidV0ToDigest32(res.profileCid as CidV0);

    return {
      productCid: res.productCid as CidV0,
      linkCid: res.linkCid as CidV0 | undefined,
      headCid: res.headCid as CidV0,
      indexCid: res.indexCid as CidV0,
      profileCid: res.profileCid as CidV0,
      digest32,
      txHash: normalizeTxHash(res.txHash),
    };
  }

  async function tombstone(p: {
    avatar: Address;
    operator: Address;
    sku: string;
    chainId?: number;
  }): Promise<AppendOfferResult> {
    const avatar = normalizeAddress(p.avatar);
    const operator = normalizeAddress(p.operator);
    const chainId = p.chainId ?? 100;

    const signer = toAvatarSigner(avatar, chainId, safe);

    const res = await sdkOffers.tombstone({
      avatar,
      operator,
      signer,
      chainId,
      sku: p.sku,
    });

    return {
      // Tombstones do not expose the payload CID via SDK at the moment.
      // Keep productCid empty by convention; downstream should ignore it for tombstones.
      productCid: '' as CidV0,
      linkCid: res.linkCid as CidV0 | undefined,
      headCid: res.headCid as CidV0,
      indexCid: res.indexCid as CidV0,
      profileCid: res.profileCid as CidV0,
      digest32: cidV0ToDigest32(res.profileCid as CidV0),
      txHash: normalizeTxHash(res.txHash),
    };
  }

  return { appendOffer, tombstone };
}
