import { buildProduct } from './offersJsonld';
import { canonicaliseLink, buildLinkDraft, loadProfileOrInit, loadIndex, insertIntoHead, saveHeadAndIndex, rebaseAndSaveProfile, } from '@circles-profile/core';
import { normalizeEvmAddress, assertSku } from './utils';
export class OffersClientImpl {
    constructor(bindings) {
        this.bindings = bindings;
    }
    ensureBindings() {
        if (!this.bindings) {
            throw new Error('OffersClient requires profilesBindings to be provided to CirclesClient.');
        }
        return this.bindings;
    }
    async publishOffer(opts) {
        const b = this.ensureBindings();
        const chainId = opts.chainId ?? 100;
        const avatar = normalizeEvmAddress(opts.avatar);
        const operator = normalizeEvmAddress(opts.operator);
        const gateway = opts.paymentGateway ? normalizeEvmAddress(opts.paymentGateway) : undefined;
        assertSku(opts.product.sku);
        // Build product JSON-LD
        const productObj = buildProduct(opts.product, opts.offer);
        // Attach PayAction on first offer
        const offerArray = Array.isArray(productObj.offers) ? productObj.offers : [];
        const offer0 = offerArray[0];
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
        const link = await buildLinkDraft({
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
        const currentIndexCid = profile.namespaces?.[operator] ?? null;
        const { index, head } = await loadIndex(b, currentIndexCid);
        const { rotated, closedHead } = insertIntoHead(head, link);
        const { headCid, indexCid } = await saveHeadAndIndex(b, head, index, closedHead);
        const profileCid = await rebaseAndSaveProfile(b, avatar, (prof) => {
            prof.namespaces[operator] = indexCid;
        });
        const txHash = await b.updateAvatarProfileDigest(avatar, profileCid);
        // Optionally pin link itself
        let linkCid;
        try {
            linkCid = await b.putJsonLd(link);
        }
        catch {
            // optional
        }
        return { productCid, headCid, indexCid, profileCid, linkCid, txHash: txHash || undefined };
    }
    async tombstone(opts) {
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
        const link = await buildLinkDraft({
            name: `product/${opts.sku}`,
            cid: payloadCid,
            chainId,
            signerAddress: avatar,
        });
        const preimage = canonicaliseLink(link);
        const signature = await opts.signer.signBytes(preimage);
        link.signature = signature;
        const { profile } = await loadProfileOrInit(b, avatar);
        const currentIndexCid = profile.namespaces?.[operator] ?? null;
        const { index, head } = await loadIndex(b, currentIndexCid);
        const { rotated, closedHead } = insertIntoHead(head, link);
        const { headCid, indexCid } = await saveHeadAndIndex(b, head, index, closedHead);
        const profileCid = await rebaseAndSaveProfile(b, avatar, (prof) => {
            prof.namespaces[operator] = indexCid;
        });
        const txHash = await b.updateAvatarProfileDigest(avatar, profileCid);
        let linkCid;
        try {
            linkCid = await b.putJsonLd(link);
        }
        catch { }
        return { headCid, indexCid, profileCid, linkCid, txHash: txHash || undefined };
    }
}
