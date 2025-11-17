import {buildProduct, buildLinkDraft, type MinimalOffer, type MinimalProduct} from './jsonld';
import {canonicaliseLink} from './canonicaliseLinkJson';
import {normalizeAddress, type Address} from './adapters';
import {cidV0ToDigest32, type CidV0, type Hex} from './cid';
import {
    InvalidSkuError,
    PinFailedError,
    SafeOwnerSignatureUnavailableError,
} from './errors';
import {loadProfileOrInit, loadIndex, insertIntoHead, saveHeadAndIndex, rebaseAndSaveProfile} from './namespaces';

// debug only
import {bytesToHex} from '$lib/safeSigner';
import {keccak256} from '$lib/safeSigner';

export type {Hex, Address, CidV0};
export type {MinimalProduct, MinimalOffer};

export type AppendOfferParams = {
    avatar: Address;
    operator: Address;
    chainId?: number;
    product: MinimalProduct;
    offer: MinimalOffer;
    debugSaveLinkObject?: boolean;
};

export type AppendOfferResult = {
    productCid: CidV0;
    linkCid?: CidV0;
    headCid: CidV0;
    indexCid: CidV0;
    profileCid: CidV0;
    digest32: Hex;
    txHash?: Hex;
};

export interface CirclesBindings {
    getLatestProfileCid(avatar: Address): Promise<CidV0 | null>;

    getProfile(cid: CidV0): Promise<any | null>;

    putJsonLd(obj: any): Promise<CidV0>;

    updateAvatarProfileDigest(avatar: Address, cid: CidV0): Promise<Hex>;

    canonicalizeJsonLd?(obj: any): Promise<string>; // optional: compare/debug only
}

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
    async function doAppend(name: string, payloadObj: any, p: AppendOfferParams): Promise<AppendOfferResult> {
        const avatar = normalizeAddress(p.avatar);
        const operator = normalizeAddress(p.operator);

        const sku = p.product?.sku ?? (p as any).sku ?? '';
        const skuOk = /^[a-z0-9][a-z0-9-_]{0,62}$/.test(sku);
        if (!skuOk) {
            throw new InvalidSkuError(sku);
        }

        const chainId = p.chainId ?? 100;

        let productCid: CidV0;
        try {
            productCid = await circles.putJsonLd(payloadObj);
        } catch (e: any) {
            throw new PinFailedError('product', String(e?.message ?? e));
        }

        const signerAddress = avatar;
        const nowSec = Math.floor(Date.now() / 1000);
        const link = await buildLinkDraft(name, productCid, chainId, signerAddress, nowSec);

        // RFC 8785 canonicalization in-browser
        const payloadBytes = canonicaliseLink(link);

        // Optional compare with server canonicalization (debug only)
        try {
            if (typeof circles.canonicalizeJsonLd === 'function') {
                const serverCanonText = await circles.canonicalizeJsonLd(link);
                const serverBytes = new TextEncoder().encode(serverCanonText);
                const localHash = keccak256(payloadBytes);
                const serverHash = keccak256(serverBytes);
                const sameLen = payloadBytes.length === serverBytes.length;

                let sameBytes = sameLen;
                if (sameLen) {
                    for (let i = 0; i < payloadBytes.length; i++) {
                        if (payloadBytes[i] !== serverBytes[i]) {
                            sameBytes = false;
                            break;
                        }
                    }
                }

                if (sameBytes) {
                    console.debug('[circles] canonicalization: MATCH (len=', payloadBytes.length, ') hash=', localHash, ')');
                } else {
                    console.warn('[circles] canonicalization: MISMATCH', {
                        localLen: payloadBytes.length,
                        serverLen: serverBytes.length,
                        localHash,
                        serverHash
                    });
                }
            }
        } catch (e) {
            console.warn('[circles] canonicalization compare failed:', (e as any)?.message ?? e);
        }

        if (!safe?.sign) {
            throw new SafeOwnerSignatureUnavailableError();
        }

        const payloadHex = bytesToHex(payloadBytes);
        console.debug('[circles] linkDraft(pre-sign):', JSON.stringify(link));
        console.debug('[circles] payload.hex:', payloadHex);
        console.debug('[circles] payload.keccak:', keccak256(payloadBytes));

        const signature = await safe.sign(payloadBytes);
        console.debug('[circles] signature.hex:', signature);
        (link as any).signature = signature;

        let linkCid: CidV0 | undefined;
        if (p.debugSaveLinkObject) {
            try {
                linkCid = await circles.putJsonLd(link);
            } catch (e: any) {
                throw new PinFailedError('link', String(e?.message ?? e));
            }
        }

        const {profile} = await loadProfileOrInit(circles as any, avatar);
        const existingIndexCid = profile.namespaces?.[operator] ?? null;
        const {index, head} = await loadIndex(circles as any, existingIndexCid ?? null);
        const {rotated, closedHead} = insertIntoHead(head, link);
        const {headCid, indexCid} = await saveHeadAndIndex(circles as any, head, index, closedHead);

        const profileCid = await rebaseAndSaveProfile(circles as any, avatar, (prof) => {
            if (!prof.namespaces) {
                prof.namespaces = {};
            }
            prof.namespaces[operator] = indexCid;
        });

        const digest = cidV0ToDigest32(profileCid);
        const txHash = await circles.updateAvatarProfileDigest(avatar, profileCid);

        return {productCid, linkCid, headCid, indexCid, profileCid, digest32: digest, txHash};
    }

    async function appendOffer(p: AppendOfferParams): Promise<AppendOfferResult> {
        const productObj = buildProduct(p.product, p.offer);
        const name = `product/${p.product.sku}`;
        return doAppend(name, productObj, p);
    }

    async function tombstone(p: {
        avatar: Address;
        operator: Address;
        sku: string;
        chainId?: number;
    }): Promise<AppendOfferResult> {
        const avatar = normalizeAddress(p.avatar);
        const operator = normalizeAddress(p.operator);
        const skuOk = /^[a-z0-9][a-z0-9-_]{0,62}$/.test(p.sku);
        if (!skuOk) {
            throw new InvalidSkuError(p.sku);
        }

        const now = Math.floor(Date.now() / 1000);
        const obj = {
            '@context': 'https://aboutcircles.com/contexts/circles-market/',
            '@type': 'Tombstone',
            sku: p.sku,
            at: now
        };
        const name = `product/${p.sku}`;

        const dummyProduct: MinimalProduct = {sku: p.sku, name: 'tombstone'};
        const dummyOffer: MinimalOffer = {price: 1, priceCurrency: 'EUR', checkout: 'https://example.com'};

        return doAppend(name, obj, {...(p as any), product: dummyProduct, offer: dummyOffer});
    }

    return {appendOffer, tombstone};
}
