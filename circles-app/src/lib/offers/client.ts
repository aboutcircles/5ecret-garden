import { normalizeAddress, type Address } from './adapters';
import { cidV0ToDigest32, type CidV0, type Hex } from './cid';
import { isValidSku } from '$lib/utils/offer';
import {
  OffersClientImpl,
  type MinimalProductInput,
  type MinimalOfferInput,
} from '@circles-market/sdk';
import { toSdkAvatarSigner } from '$lib/offers/sdkAdapter';
import type { CirclesBindings } from '$lib/offers/namespaces';

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

export function createProfilesOffersClient(
  circles: CirclesBindings,
  safe: SafeSignerLike
): ProfilesOffersClient {
  const sdkOffers = new OffersClientImpl(circles);

  async function appendOffer(p: AppendOfferParams): Promise<AppendOfferResult> {
    const avatar = normalizeAddress(p.avatar);
    const operator = normalizeAddress(p.operator);
    const chainId = p.chainId ?? 100;

    const sku = p.product.sku;
    if (!isValidSku(sku)) {
      throw new Error(`Invalid SKU: ${sku}`);
    }

    const signer = toSdkAvatarSigner(avatar, chainId, safe);

    const gateway = p.paymentGateway ? normalizeAddress(p.paymentGateway) : undefined;

    const res = await sdkOffers.publishOffer({
      avatar,
      operator,
      signer,
      chainId,
      paymentGateway: gateway as any,
      product: p.product,
      offer: p.offer,
    });

    const digest32 = (res as any).digest32 ?? cidV0ToDigest32(res.profileCid as CidV0);

    return {
      productCid: res.productCid as CidV0,
      linkCid: res.linkCid as CidV0 | undefined,
      headCid: res.headCid as CidV0,
      indexCid: res.indexCid as CidV0,
      profileCid: res.profileCid as CidV0,
      digest32: digest32 as Hex,
      txHash: (res.txHash as Hex | undefined) ?? undefined,
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

    const skuOk = isValidSku(p.sku);
    if (!skuOk) {
      throw new Error(`Invalid SKU: ${p.sku}`);
    }

    const signer = toSdkAvatarSigner(avatar, chainId, safe);

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
      txHash: (res.txHash as Hex | undefined) ?? undefined,
    };
  }

  return { appendOffer, tombstone };
}
