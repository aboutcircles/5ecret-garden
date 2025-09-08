import type { Address } from '@circles-sdk/utils';

export interface UserProfile {
  namespaces?: Record<string, string>;
  [key: string]: any;
}

export interface MessageNamespace {
  links: MessageLink[];
}

export interface MessageContent {
  txt: string;
}

export interface MessageData {
  cid: string;
  encrypted: boolean;
  encryptionAlgorithm: string;
  encryptionKeyFingerprint: string;
  chainId: bigint;
  signerAddress: string;
  signedAt: bigint;
  nonce: bigint;
}

export interface MessageLink {
  cid: string;
  encrypted: boolean;
  encryptionAlgorithm?: string;
  encryptionKeyFingerprint?: string;
  chainId: number;
  signerAddress: string;
  signedAt: number;
  nonce: string;
  signature: string;
}

export interface Message {
  txt: string;
  cid: string;
  senderAddress: Address;
  conversationWith?: Address;
  encrypted: boolean;
  signedAt: number;
  signature: string;
  nonce: string;
  chainId: number;
  isVerified?: boolean;
}

export interface MessageGroup {
  senderAddress: Address;
  messages: Message[];
  lastMessage: Message;
}