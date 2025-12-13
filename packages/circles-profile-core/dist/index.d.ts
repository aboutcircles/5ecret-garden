type CustomDataLink = {
    '@context': 'https://aboutcircles.com/contexts/circles-linking/';
    '@type': 'CustomDataLink';
    name: string;
    cid: string;
    encrypted: boolean;
    encryptionAlgorithm: string | null;
    encryptionKeyFingerprint: string | null;
    chainId: number;
    signerAddress: string;
    signedAt: number;
    nonce: `0x${string}`;
    signature: `0x${string}` | '';
};

type Cid = string;
interface ProfilesBindings {
    putJsonLd(obj: any): Promise<Cid>;
    getJsonLd(cid: Cid): Promise<any>;
    getLatestProfileCid(avatar: string): Promise<Cid | null>;
    updateAvatarProfileDigest(avatar: string, profileCid: Cid): Promise<string | void>;
    canonicalizeJsonLd?(obj: any): Promise<string> | string;
}
/**
 * Fetch JSON from an IPFS gateway. This is intentionally minimal and can be
 * replaced by bindings.getJsonLd when you have your own gateway.
 */
declare function fetchIpfsJson(cid: string, gatewayUrl?: string): Promise<any>;
declare function ensureProfileShape(obj: any): any;
declare function ensureNamespaceChunkShape(obj: any): any;
declare function ensureNameIndexDocShape(obj: any): any;
declare function loadProfileOrInit(bindings: ProfilesBindings, avatar: string): Promise<{
    profile: any;
    profileCid: Cid | null;
}>;
declare function loadIndex(bindings: ProfilesBindings, indexCid: Cid | null): Promise<{
    index: any;
    head: any;
    headCid: Cid | null;
}>;
declare function insertIntoHead(head: any, signedLink: CustomDataLink): {
    rotated: boolean;
    closedHead?: any;
};
declare function saveHeadAndIndex(bindings: ProfilesBindings, head: any, index: any, closedHead?: any): Promise<{
    headCid: Cid;
    indexCid: Cid;
}>;
declare function rebaseAndSaveProfile(bindings: ProfilesBindings, avatar: string, mutator: (profile: any) => void): Promise<Cid>;

declare class CanonicalisationError extends Error {
}
declare class ObjectTooLargeError extends Error {
}
declare function canonicaliseLink(link: CustomDataLink): Uint8Array;
declare function buildLinkDraft(args: {
    name: string;
    cid: string;
    chainId: number;
    signerAddress: string;
    nowSec?: number;
}): Promise<CustomDataLink>;

export { CanonicalisationError, type Cid, type CustomDataLink, ObjectTooLargeError, type ProfilesBindings, buildLinkDraft, canonicaliseLink, ensureNameIndexDocShape, ensureNamespaceChunkShape, ensureProfileShape, fetchIpfsJson, insertIntoHead, loadIndex, loadProfileOrInit, rebaseAndSaveProfile, saveHeadAndIndex };
