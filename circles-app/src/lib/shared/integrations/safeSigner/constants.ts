import { keccak256, utf8ToBytes } from './keccak';
import type { Hex } from './types';

export const SAFE_MESSAGE_TYPE = 'SafeMessage(bytes message)';
export const DOMAIN_TYPE = 'EIP712Domain(uint256 chainId,address verifyingContract)';

export function safeMessageTypeHash(): Hex {
  return keccak256(utf8ToBytes(SAFE_MESSAGE_TYPE));
}

export function domainTypeHash(): Hex {
  return keccak256(utf8ToBytes(DOMAIN_TYPE));
}
