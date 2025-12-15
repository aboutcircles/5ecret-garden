import type { MinimalOfferInput, MinimalProductInput } from './offersTypes';
import type { AvatarSigner } from '@circles-market/signers';
import { buildProduct } from './offersJsonld';
import type { CustomDataLink, ProfilesBindings as CoreProfilesBindings } from '@circles-profile/core';
import {
  buildLinkDraft,
  canonicaliseLink,
  insertIntoHead,
  loadIndex,
  loadProfileOrInit,
  rebaseAndSaveProfile,
  saveHeadAndIndex,
  cidV0ToDigest32Strict,
} from '@circles-profile/core';
import { assertSku, type Hex, normalizeEvmAddress, normalizeHex32 } from '@circles-market/core';

// Backwards-compatible alias: package exports ProfilesBindings
export type ProfilesBindings = CoreProfilesBindings;

export interface OffersClient {
  publishOffer(opts: {
    avatar: string;
    operator: string;
    signer: AvatarSigner;
    chainId?: number;
    paymentGateway?: string;
    product: MinimalProductInput;
    offer: MinimalOfferInput;
  }): Promise<{
    productCid: string;
    headCid: string;
    indexCid: string;
    profileCid: string;
    linkCid?: string;
    digest32: Hex;
    txHash?: Hex;
  }>;

  tombstone(opts: {
    avatar: string;
    operator: string;
    signer: AvatarSigner;
    chainId?: number;
    sku: string;
  }): Promise<{
    linkCid?: string;
    headCid: string;
    indexCid: string;
    profileCid: string;
    digest32: Hex;
    txHash?: Hex;
  }>;
}

export class OffersClientImpl implements OffersClient {
  constructor(private readonly bindings?: ProfilesBindings) {}

  private ensureBindings(): ProfilesBindings {
    if (!this.bindings) {
      throw new Error('OffersClient requires profilesBindings to be provided to CirclesClient.');
    }
    return this.bindings;
  }

  private assertSignerMatches(avatar: string, chainId: number, signer: AvatarSigner): void {
    const expectedAvatar = avatar.toLowerCase();
    const expectedChainId = BigInt(chainId);
    const signerAvatar = signer.avatar.toLowerCase();
    if (signerAvatar !== expectedAvatar) {
      throw new Error(`Signer avatar mismatch. Expected ${expectedAvatar}, got ${signerAvatar}`);
    }
    if (signer.chainId !== expectedChainId) {
      throw new Error(`Signer chainId mismatch. Expected ${expectedChainId}, got ${signer.chainId}`);
    }
  }

  async publishOffer(opts: {
    avatar: string;
    operator: string;
    signer: AvatarSigner;
    chainId?: number;
    paymentGateway?: string;
    product: MinimalProductInput;
    offer: MinimalOfferInput;
  }): Promise<{
    productCid: string;
    headCid: string;
    indexCid: string;
    profileCid: string;
    linkCid?: string;
    digest32: Hex;
    txHash?: Hex;
  }> {
    const b = this.ensureBindings();
    const chainId = opts.chainId ?? 100;
    const avatar = normalizeEvmAddress(opts.avatar);
    const operator = normalizeEvmAddress(opts.operator);
    const gateway = opts.paymentGateway ? normalizeEvmAddress(opts.paymentGateway) : undefined;
    this.assertSignerMatches(avatar, chainId, opts.signer);
    assertSku(opts.product.sku);

    // Build product JSON-LD
    const productObj: any = buildProduct(opts.product, opts.offer);

    // Attach PayAction on first offer
    const offerArray = Array.isArray(productObj.offers) ? productObj.offers : [];
    const offer0 = offerArray[0] as any;
    if (offer0) {
      const payTo = gateway ?? avatar;
      offer0.potentialAction = {
        '@type': 'PayAction',
        price: offer0.price,
        priceCurrency: offer0.priceCurrency,
        recipient: { '@id': `eip155:${chainId}:${payTo}` },
        instrument: {
          '@type': 'PropertyValue',
          propertyID: 'eip155',
          value: `${chainId}:${payTo}`,
          name: 'pay-to',
        },
      };
    }

    const productCid = await b.putJsonLd(productObj);

    // Build link draft
    const link: CustomDataLink = await buildLinkDraft({
      name: `product/${opts.product.sku}`,
      cid: productCid,
      chainId,
      signerAddress: avatar,
    });

    // Canonicalise and sign
    const preimage = canonicaliseLink(link);
    const signature = await opts.signer.signBytes(preimage);
    link.signature = signature;

    // Load profile/index
    const { profile } = await loadProfileOrInit(b, avatar);
    const currentIndexCid: string | null = profile.namespaces?.[operator] ?? null;
    const { index, head } = await loadIndex(b, currentIndexCid);
    const { rotated, closedHead } = insertIntoHead(head, link);
    const { headCid, indexCid } = await saveHeadAndIndex(b, head, index, closedHead);

    const profileCid = await rebaseAndSaveProfile(b, avatar, (prof) => {
      prof.namespaces[operator] = indexCid;
    });

    const txHash = await b.updateAvatarProfileDigest(avatar, profileCid);
    const txHashNorm = normalizeHex32(txHash, 'txHash');

    const digest32 = cidV0ToDigest32Strict(profileCid);

    return { productCid, headCid, indexCid, profileCid, digest32, txHash: txHashNorm };
  }

  async tombstone(opts: {
    avatar: string;
    operator: string;
    signer: AvatarSigner;
    chainId?: number;
    sku: string;
  }): Promise<{
    linkCid?: string;
    headCid: string;
    indexCid: string;
    profileCid: string;
    digest32: Hex;
    txHash?: Hex;
  }> {
    const b = this.ensureBindings();
    const chainId = opts.chainId ?? 100;
    const avatar = normalizeEvmAddress(opts.avatar);
    const operator = normalizeEvmAddress(opts.operator);
    this.assertSignerMatches(avatar, chainId, opts.signer);
    assertSku(opts.sku);

    // Build tombstone JSON-LD payload and store on IPFS
    const nowSec = Math.floor(Date.now() / 1000);
    const tomb = {
      '@context': 'https://aboutcircles.com/contexts/circles-market/',
      '@type': 'Tombstone',
      sku: opts.sku,
      at: nowSec,
    };
    const payloadCid = await b.putJsonLd(tomb);

    // Link points to the payload CID
    const link: CustomDataLink = await buildLinkDraft({
      name: `product/${opts.sku}`,
      cid: payloadCid,
      chainId,
      signerAddress: avatar,
    });

    const preimage = canonicaliseLink(link);
    const signature = await opts.signer.signBytes(preimage);
    link.signature = signature;

    const { profile } = await loadProfileOrInit(b, avatar);
    const currentIndexCid: string | null = profile.namespaces?.[operator] ?? null;
    const { index, head } = await loadIndex(b, currentIndexCid);
    const { rotated, closedHead } = insertIntoHead(head, link);
    const { headCid, indexCid } = await saveHeadAndIndex(b, head, index, closedHead);

    const profileCid = await rebaseAndSaveProfile(b, avatar, (prof) => {
      prof.namespaces[operator] = indexCid;
    });

    const txHash = await b.updateAvatarProfileDigest(avatar, profileCid);
    const txHashNorm = normalizeHex32(txHash, 'txHash');
    const digest32 = cidV0ToDigest32Strict(profileCid);

    return { headCid, indexCid, profileCid, digest32, txHash: txHashNorm };
  }
}
