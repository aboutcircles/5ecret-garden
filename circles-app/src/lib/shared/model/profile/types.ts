// src/lib/profiles/types.ts
export type ProfileAddress = `0x${string}`;

export type AppProfile = {
  '@context'?: unknown;
  '@type'?: unknown;

  name?: string;
  description?: string;
  location?: string;
  imageUrl?: string;
  previewImageUrl?: string;

  namespaces: Record<string, string>;
  signingKeys: Record<string, any>;

  [k: string]: unknown;
};

export type AppProfileCore = {
  name: string;
  description?: string;
  location?: string;
  imageUrl?: string;
  previewImageUrl?: string;
};

export enum FallbackImageUrl {
  Person = '/person.svg',
  Group = '/group.svg',
  Organization = '/organization.svg',
  Logo = '/logo.svg',
}

export type SearchProfileResult = {
  address: ProfileAddress;
  name?: string;
  description?: string;
  previewImageUrl?: string;
  imageUrl?: string;
  location?: string;
  registeredName?: string | null;
  lastUpdatedAt?: number;
  avatarType?: string; // keep loose; comes from RPC search
};
