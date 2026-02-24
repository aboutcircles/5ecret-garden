import { normalizeEvmAddress } from '@circles-market/core';

export interface WalletProvider {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
}

export interface AvatarSigner {
  avatar: string; // safe address lowercased
  chainId: bigint;
  signBytes(payload: Uint8Array): Promise<`0x${string}`>;
}

export interface SignersClient {
  createSafeSignerForAvatar(opts: {
    avatar: string;
    ethereum: WalletProvider;
    chainId: bigint;
    enforceChainId?: boolean;
  }): Promise<AvatarSigner>;
}

export class SignersClientImpl implements SignersClient {
  async createSafeSignerForAvatar(opts: {
    avatar: string;
    ethereum: WalletProvider;
    chainId: bigint;
    enforceChainId?: boolean;
  }): Promise<AvatarSigner> {
    const avatar = normalizeEvmAddress(opts.avatar);
    const chainId = opts.chainId;

    if (opts.enforceChainId) {
      const reported = await opts.ethereum.request<string>({ method: 'eth_chainId' });
      const reportedNum = BigInt(reported);
      if (reportedNum !== chainId) {
        throw new Error(`Wrong chain. Expected ${chainId} got ${reported}`);
      }
    }

    // Request accounts and capture owner EOA to use as `from` for signing
    const accounts = await opts.ethereum.request<string[]>({ method: 'eth_requestAccounts', params: [] });
    if (!accounts || accounts.length === 0) {
      throw new Error('No EOA account unlocked in wallet');
    }
    const owner = normalizeEvmAddress(accounts[0]);

    const signer: AvatarSigner = {
      avatar,
      chainId,
      signBytes: async (payload: Uint8Array) => {
        // Build EIP-712 Typed Data for SafeMessage(bytes)
        const typedData = buildSafeMessageTypedData(avatar, chainId, payload);
        const sig = await opts.ethereum.request<string>({
          method: 'eth_signTypedData_v4',
          params: [owner, JSON.stringify(typedData)],
        });
        return sig as `0x${string}`;
      },
    };

    return signer;
  }
}


function toHex(bytes: Uint8Array): `0x${string}` {
  return ('0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

// Minimal Safe v1.3 typed data for SafeMessage(bytes)
function buildSafeMessageTypedData(avatar: string, chainId: bigint, payload: Uint8Array) {
  return {
    domain: {
      chainId: Number(chainId),
      verifyingContract: avatar,
    },
    primaryType: 'SafeMessage',
    types: {
      EIP712Domain: [
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      SafeMessage: [{ name: 'message', type: 'bytes' }],
    },
    message: {
      message: toHex(payload),
    },
  } as const;
}
