export type Hex = `0x${string}`;
export type Address = `0x${string}`;

// Lightweight EIP-1193 surface we need
export type EIP1193Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

export type DigestSigner = {
  signDigest(digest: Hex): Promise<{ r: Hex; s: Hex; v: 27 | 28 }>;
  address?: Address;
};
