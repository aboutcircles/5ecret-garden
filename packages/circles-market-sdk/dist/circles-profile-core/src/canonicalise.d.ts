import type { CustomDataLink } from './links';
export declare class CanonicalisationError extends Error {
}
export declare class ObjectTooLargeError extends Error {
}
export declare function canonicaliseLink(link: CustomDataLink): Uint8Array;
export declare function buildLinkDraft(args: {
    name: string;
    cid: string;
    chainId: number;
    signerAddress: string;
    nowSec?: number;
}): Promise<CustomDataLink>;
//# sourceMappingURL=canonicalise.d.ts.map