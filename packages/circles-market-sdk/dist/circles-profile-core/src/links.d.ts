export type CustomDataLink = {
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
//# sourceMappingURL=links.d.ts.map