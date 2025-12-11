export type CustomDataLink = {
  '@context': 'https://aboutcircles.com/contexts/circles-linking/';
  '@type': 'CustomDataLink';
  name: string; // e.g. "product/<sku>" or "tombstone/<sku>"
  cid: string;  // payload CID
  encrypted: boolean;
  encryptionAlgorithm: string | null;
  encryptionKeyFingerprint: string | null;
  chainId: number;
  signerAddress: string; // lowercase address
  signedAt: number;      // unix seconds
  nonce: `0x${string}`;  // 0x + 32 hex (16 bytes)
  signature: `0x${string}` | ''; // empty before signing
};
