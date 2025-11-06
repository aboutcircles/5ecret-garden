// Public API for profiles-offers-lite
import { buildProduct, buildLinkDraft, type MinimalOffer, type MinimalProduct } from './jsonld';
import { canonicaliseLink } from './canon';
import { keccak256, normalizeAddress, type Address } from './adapters';
import { cidV0ToDigest32, type CidV0, type Hex } from './cid';
import { InvalidAddressError, InvalidSkuError, InvalidUriError, CurrencyCodeError, ObjectTooLargeError, PinFailedError, SafeOwnerSignatureUnavailableError } from './errors';
import { loadProfileOrInit, loadIndex, insertIntoHead, saveHeadAndIndex, rebaseAndSaveProfile } from './namespaces';

export type { Hex, Address, CidV0 };

export type ProductImage =
  | string
  | { "@type": "ImageObject"; contentUrl?: string; url?: string };

export type { MinimalProduct, MinimalOffer };

export type AppendOfferParams = {
  avatar: Address; // seller (EOA or Safe)
  operator: Address; // namespace key (address)
  chainId?: number; // default 100
  product: MinimalProduct;
  offer: MinimalOffer;
  ownerAddress?: Address; // optional Safe owner EOA for signing
  debugSaveLinkObject?: boolean; // default false; save link JSON separately for audit
};

export type AppendOfferResult = {
  productCid: CidV0;
  linkCid?: CidV0; // present only when debugSaveLinkObject == true
  headCid: CidV0;
  indexCid: CidV0;
  profileCid: CidV0;
  digest32: Hex;
  txHash?: Hex;
};

export interface CirclesBindings {
  getLatestProfileCid(avatar: Address): Promise<CidV0 | null>;
  getProfile(cid: CidV0): Promise<any | null>;
  putJsonLd(obj: any): Promise<CidV0>; // must return CIDv0
  updateAvatarProfileDigest(avatar: Address, cid: CidV0): Promise<Hex>;
}

export interface SignerBindings {
  // EOA path: sign 32-byte keccak (hex)
  signKeccakDigest?(addr: Address, digest32: Hex): Promise<Hex>;

  // Safe path: owner EOA signs SafeMessage hash over raw payload bytes
  signSafeHash?(
    safe: Address,
    owner: Address,
    chainId: bigint,
    payloadBytes: Uint8Array
  ): Promise<Hex>;
}

export interface ProfilesOffersClient {
  appendOffer(p: AppendOfferParams): Promise<AppendOfferResult>;
  tombstone(p: { avatar: Address; operator: Address; sku: string; chainId?: number }): Promise<AppendOfferResult>;
}

export function createProfilesOffersClient(
  circles: CirclesBindings,
  signer: SignerBindings
): ProfilesOffersClient {
  async function doAppend(name: string, payloadObj: any, p: AppendOfferParams): Promise<AppendOfferResult> {
    // 1. validate addresses
    const avatar = normalizeAddress(p.avatar);
    const operator = normalizeAddress(p.operator);

    // sku
    if (!/^[a-z0-9][a-z0-9-_]{0,62}$/.test(p.product?.sku ?? (p as any).sku ?? '')) {
      throw new InvalidSkuError(p.product?.sku ?? (p as any).sku ?? '');
    }
    const chainId = p.chainId ?? 100;

    // 2. Save product/tombstone
    let productCid: CidV0;
    try {
      productCid = await circles.putJsonLd(payloadObj);
    } catch (e: any) {
      throw new PinFailedError('product', String(e?.message ?? e));
    }

    // 3. Draft link
    const signerAddress = avatar;
    const nowSec = Math.floor(Date.now() / 1000);
    const link = await buildLinkDraft(name, productCid, chainId, signerAddress, nowSec);

    // 4. Canonicalise and digest
    const payloadBytes = canonicaliseLink(link);
    const messageHash = keccak256(payloadBytes);

    // 5. Sign
    let signature: Hex | undefined;

    // Prefer Safe path only if we have both the function and an explicit owner address
    const ownerAddr = (p as any).ownerAddress as Address | undefined;

    if (signer.signSafeHash && ownerAddr) {
      signature = await signer.signSafeHash(avatar /* safe */, ownerAddr /* owner EOA */, BigInt(chainId), payloadBytes);
    } else if (signer.signKeccakDigest) {
      signature = await signer.signKeccakDigest(avatar /* EOA signer */, messageHash);
    } else if (signer.signSafeHash) {
      // We have Safe capability but no owner identity to sign with
      throw new SafeOwnerSignatureUnavailableError();
    } else {
      throw new SafeOwnerSignatureUnavailableError();
    }
    (link as any).signature = signature;

    // Optional save link JSON
    let linkCid: CidV0 | undefined;
    if (p.debugSaveLinkObject) {
      try {
        linkCid = await circles.putJsonLd(link);
      } catch (e: any) {
        throw new PinFailedError('link', String(e?.message ?? e));
      }
    }

    // 7. Namespace write
    const { profile } = await loadProfileOrInit(circles as any, avatar);
    const existingIndexCid = profile.namespaces?.[operator] ?? null;
    const { index, head } = await loadIndex(circles as any, existingIndexCid ?? null);
    const { rotated, closedHead } = insertIntoHead(head, link);
    const { headCid, indexCid } = await saveHeadAndIndex(circles as any, head, index, closedHead);

    // 8. Rebase profile and set namespace
    const profileCid = await rebaseAndSaveProfile(circles as any, avatar, (prof) => {
      if (!prof.namespaces) prof.namespaces = {};
      prof.namespaces[operator] = indexCid;
    });

    // 9. Compute digest
    const digest = cidV0ToDigest32(profileCid);

    // 10. Publish digest
    const txHash = await circles.updateAvatarProfileDigest(avatar, profileCid);

    return { productCid, linkCid, headCid, indexCid, profileCid, digest32: digest, txHash };
  }

  async function appendOffer(p: AppendOfferParams): Promise<AppendOfferResult> {
    // basic validation of URIs and price/currency handled in buildProduct
    const productObj = buildProduct(p.product, p.offer);
    const name = `product/${p.product.sku}`;
    return doAppend(name, productObj, p);
  }

  async function tombstone(p: { avatar: Address; operator: Address; sku: string; chainId?: number }): Promise<AppendOfferResult> {
    const avatar = normalizeAddress(p.avatar);
    const operator = normalizeAddress(p.operator);
    if (!/^[a-z0-9][a-z0-9-_]{0,62}$/.test(p.sku)) throw new InvalidSkuError(p.sku);
    const now = Math.floor(Date.now() / 1000);
    const obj = { '@context': 'https://aboutcircles.com/contexts/circles-market/', '@type': 'Tombstone', sku: p.sku, at: now };
    const name = `product/${p.sku}`;
    return doAppend(name, obj, { ...(p as any), product: { sku: p.sku, name: 'tombstone' }, offer: { price: 1, priceCurrency: 'USD', checkout: 'https://example.com' } });
  }

  return { appendOffer, tombstone };
}
