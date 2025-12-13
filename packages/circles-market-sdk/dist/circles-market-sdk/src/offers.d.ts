import type { MinimalOfferInput, MinimalProductInput } from './offersTypes';
import type { AvatarSigner } from './signers';
import type { ProfilesBindings as CoreProfilesBindings } from '@circles-profile/core';
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
export declare class OffersClientImpl implements OffersClient {
    private readonly bindings?;
    constructor(bindings?: ProfilesBindings | undefined);
    private ensureBindings;
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
//# sourceMappingURL=offers.d.ts.map