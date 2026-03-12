import type { WalletProvider } from '@circles-market/sdk';
import { gnosisConfig } from '$lib/shared/config/circles';

type AddChainParams = {
  chainId: string;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls: string[];
};

// RPC URLs sourced from gnosisConfig (single source of truth)
const chainRpc = gnosisConfig.production.chainRpcUrl ?? gnosisConfig.production.circlesRpcUrl;

const GNOSIS_PARAMS: AddChainParams = {
  chainId: gnosisConfig.production.marketChainIdHex!,
  chainName: 'Gnosis Chain',
  nativeCurrency: { name: 'xDAI', symbol: 'XDAI', decimals: 18 },
  rpcUrls: [chainRpc, 'https://rpc.gnosis.gateway.fm'],
  blockExplorerUrls: ['https://gnosisscan.io'],
};

export async function ensureGnosisChain(ethereum: WalletProvider): Promise<void> {
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: gnosisConfig.production.marketChainIdHex }],
    });
  } catch (e: any) {
    const methodNotFound = e?.code === -32601; // local provider or unsupported
    const missing = e?.code === 4902; // chain not added
    if (methodNotFound) {
      // Likely a local provider; nothing to switch.
      return;
    }
    if (!missing) {
      throw e;
    }
    try {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [GNOSIS_PARAMS],
      });
    } catch (e2: any) {
      if (e2?.code === -32601) {
        // Unsupported for local provider — ignore.
        return;
      }
      throw e2;
    }
  }
}
