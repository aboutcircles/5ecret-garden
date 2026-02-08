// circles-app/src/lib/offers/client.ts
import { type CidV0, type Hex } from './cid';
import {
  OffersClientImpl,
  normalizeEvmAddress as normalizeAddress,
  type AvatarSigner,
  type MinimalProductInput,
  type MinimalOfferInput,
  type ProfilesBindings,
} from '@circles-market/sdk';
import type { Address } from '@circles-sdk/utils';
import { getProfilesBindings } from '$lib/domains/market/offers/profilesBindings';
import { getMarketClient } from '$lib/sdk/marketClient';

export type { Hex, Address, CidV0 };
export type MinimalProduct = MinimalProductInput;
export type MinimalOffer = MinimalOfferInput;

export type AppendOfferParams = {
  avatar: Address;
  operator: Address;
  chainId?: number;
  product: MinimalProduct;
  offer: MinimalOffer;
  paymentGateway?: Address;
};

export type PublishOfferResult = {
  kind: 'publish';
  productCid: CidV0;
  headCid: CidV0;
  indexCid: CidV0;
  profileCid: CidV0;
  /**
   * 32-byte digest derived from profileCid (not the product payload nor link).
   * Provided by SDK; callers should not assume it hashes the product.
   */
  digest32: Hex;
  txHash?: Hex;
};

export type TombstoneResult = {
  kind: 'tombstone';
  sku: string;
  headCid: CidV0;
  indexCid: CidV0;
  profileCid: CidV0;
  digest32: Hex;
  txHash?: Hex;
};

export type AppendOfferResult = PublishOfferResult | TombstoneResult;

export interface ProfilesOffersClient {
  appendOffer(p: AppendOfferParams): Promise<PublishOfferResult>;
  tombstone(p: { avatar: Address; operator: Address; sku: string; chainId?: number }): Promise<TombstoneResult>;
}

function createProfilesOffersClient(circles: ProfilesBindings, signer: AvatarSigner): ProfilesOffersClient {
  const sdkOffers = new OffersClientImpl(circles);

  async function appendOffer(p: AppendOfferParams): Promise<PublishOfferResult> {
    const avatar = normalizeAddress(p.avatar);
    const operator = normalizeAddress(p.operator);
    const chainId = p.chainId ?? 100;

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

    return {
      kind: 'publish',
      productCid: res.productCid as CidV0,
      headCid: res.headCid as CidV0,
      indexCid: res.indexCid as CidV0,
      profileCid: res.profileCid as CidV0,
      digest32: res.digest32,
      txHash: res.txHash,
    };
  }

  async function tombstone(p: { avatar: Address; operator: Address; sku: string; chainId?: number }): Promise<TombstoneResult> {
    const avatar = normalizeAddress(p.avatar);
    const operator = normalizeAddress(p.operator);
    const chainId = p.chainId ?? 100;

    const res = await sdkOffers.tombstone({
      avatar,
      operator,
      signer,
      chainId,
      sku: p.sku,
    });

    return {
      kind: 'tombstone',
      sku: p.sku,
      headCid: res.headCid as CidV0,
      indexCid: res.indexCid as CidV0,
      profileCid: res.profileCid as CidV0,
      digest32: res.digest32,
      txHash: res.txHash,
    };
  }

  return { appendOffer, tombstone };
}

export async function createOffersClientForAvatar(params: {
  avatar: Address;
  chainId: number;
  ethereum: any;
  pinApiBase?: string;
  gatewayUrlForCid?: (cid: string) => string;
}): Promise<{
  offers: ProfilesOffersClient;
  media?: {
    pinMediaBytes: (bytes: Uint8Array, mime?: string | null) => Promise<string>;
    gatewayUrlForCid: (cid: string) => string;
  };
}> {
  const { avatar, chainId, ethereum, pinApiBase, gatewayUrlForCid } = params;
  const { bindings, media } = getProfilesBindings({ pinApiBase, gatewayUrlForCid });

  const signer = await getMarketClient().signers.createSafeSignerForAvatar({
    avatar,
    ethereum,
    chainId: BigInt(chainId),
    enforceChainId: true,
  });

  const offers = createProfilesOffersClient(bindings, signer);
  return { offers, media };
}
