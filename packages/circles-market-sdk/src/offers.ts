import type { MinimalOfferInput, MinimalProductInput } from './offersTypes';
import type { AvatarSigner } from './signers';
import { buildProduct } from './offersJsonld';
import type { ProfilesBindings as CoreProfilesBindings, CustomDataLink } from '@circles-profile/core';
import {
  canonicaliseLink,
  buildLinkDraft,
  loadProfileOrInit,
  loadIndex,
  insertIntoHead,
  saveHeadAndIndex,
  rebaseAndSaveProfile,
} from '@circles-profile/core';
import { normalizeEvmAddress, assertSku } from './utils';

// Backwards-compatible alias: SDK still exports ProfilesBindings
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
    digest32?: string;
    txHash?: string;
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
    txHash?: string;
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
    digest32?: string;
    txHash?: string;
  }> {
    const b = this.ensureBindings();
    const chainId = opts.chainId ?? 100;
    const avatar = normalizeEvmAddress(opts.avatar);
    const operator = normalizeEvmAddress(opts.operator);
    const gateway = opts.paymentGateway ? normalizeEvmAddress(opts.paymentGateway) : undefined;
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

    // Optionally pin link itself
    let linkCid: string | undefined;
    try {
      linkCid = await b.putJsonLd(link);
    } catch {
      // optional
    }

    return { productCid, headCid, indexCid, profileCid, linkCid, txHash: txHash || undefined };
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
    txHash?: string;
  }> {
    const b = this.ensureBindings();
    const chainId = opts.chainId ?? 100;
    const avatar = normalizeEvmAddress(opts.avatar);
    const operator = normalizeEvmAddress(opts.operator);
    assertSku(opts.sku);

    const nowSec = Math.floor(Date.now() / 1000);
    const tomb = {
      '@context': 'https://aboutcircles.com/contexts/circles-market/',
      '@type': 'Tombstone',
      sku: opts.sku,
      at: nowSec,
    };

    const payloadCid = await b.putJsonLd(tomb);

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

    let linkCid: string | undefined;
    try {
      linkCid = await b.putJsonLd(link);
    } catch {}

    return { headCid, indexCid, profileCid, linkCid, txHash: txHash || undefined };
  }
}
