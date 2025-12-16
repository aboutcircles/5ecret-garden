import type {WalletProvider} from '@circles-market/sdk';
import {CirclesStorage} from '$lib/utils/storage';
import {GNOSIS_CHAIN_ID_HEX} from '$lib/config/market';
import {privateKeyToAccount} from 'viem/accounts';

// viem v2: use account.signTypedData instead of a top-level signTypedData export
type TypedDataDefinition = {
  domain: any;
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: any;
};

/**
 * Minimal EIP-1193-compatible provider backed by a locally stored private key.
 * Supports methods used by the market signers/auth flows.
 */
export function createLocalWalletProvider(): WalletProvider {
  const pk = CirclesStorage.getInstance().privateKey as `0x${string}` | undefined;
  if (!pk) throw new Error('No local private key in storage');

  const account = privateKeyToAccount(pk);
  const address = account.address;
  return {
    async request<T>({ method, params }: { method: string; params?: unknown[] }): Promise<T> {
      switch (method) {
        case 'eth_chainId': {
          return GNOSIS_CHAIN_ID_HEX as unknown as T;
        }
        case 'eth_requestAccounts': {
          return [address] as unknown as T;
        }
        case 'eth_signTypedData_v4': {
          const [maybeOwner, typedDataJson] = (params ?? []) as [string | undefined, string | undefined];
          if (!typedDataJson) throw new Error('eth_signTypedData_v4 requires typed data JSON');
          // We ignore maybeOwner and always sign with the local key's account
          const typed = JSON.parse(typedDataJson) as TypedDataDefinition;
          const signature = await account.signTypedData(typed as any);
          return signature as unknown as T;
        }
        default: {
          const err: any = new Error(`Method not supported by LocalWalletProvider: ${method}`);
          err.code = -32601; // JSON-RPC Method not found
          throw err;
        }
      }
    },
  };
}
