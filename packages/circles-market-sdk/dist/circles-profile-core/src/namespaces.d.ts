import type { CustomDataLink } from './links';
export type Cid = string;
export interface ProfilesBindings {
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
export declare function fetchIpfsJson(cid: string, gatewayUrl?: string): Promise<any>;
export declare function ensureProfileShape(obj: any): any;
export declare function ensureNamespaceChunkShape(obj: any): any;
export declare function ensureNameIndexDocShape(obj: any): any;
export declare function loadProfileOrInit(bindings: ProfilesBindings, avatar: string): Promise<{
    profile: any;
    profileCid: Cid | null;
}>;
export declare function loadIndex(bindings: ProfilesBindings, indexCid: Cid | null): Promise<{
    index: any;
    head: any;
    headCid: Cid | null;
}>;
export declare function insertIntoHead(head: any, signedLink: CustomDataLink): {
    rotated: boolean;
    closedHead?: any;
};
export declare function saveHeadAndIndex(bindings: ProfilesBindings, head: any, index: any, closedHead?: any): Promise<{
    headCid: Cid;
    indexCid: Cid;
}>;
export declare function rebaseAndSaveProfile(bindings: ProfilesBindings, avatar: string, mutator: (profile: any) => void): Promise<Cid>;
//# sourceMappingURL=namespaces.d.ts.map