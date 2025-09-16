import type { Address } from '@circles-sdk/utils';

export interface UserProfile {
  namespaces?: Record<string, string>;
  [key: string]: any;
}

export interface NameIndexDoc {
  head: string;
  entries: Record<string, string>;
}

export interface NamespaceChunk {
  prev: string | null;
  links: MessageLink[];
}

export interface MessageContent {
  txt: string;
}

export interface MessageData {
  name: string;
  cid: string;
  encrypted: boolean;
  encryptionAlgorithm: string;
  encryptionKeyFingerprint: string;
  chainId: bigint;
  signerAddress: string;
  signedAt: bigint;
  nonce: string;
  [key: string]: unknown; // For EIP-712 compatibility
}

export interface MessageLink {
  name: string;
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
  name: string;
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