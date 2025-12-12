import { GNOSIS_CHAIN_ID_HEX } from '$lib/config/market';
import type { WalletProvider } from '@circles-market/sdk';

type AddChainParams = {
  chainId: string;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls: string[];
};

const GNOSIS_PARAMS: AddChainParams = {
  chainId: GNOSIS_CHAIN_ID_HEX,
  chainName: 'Gnosis Chain',
  nativeCurrency: { name: 'xDAI', symbol: 'XDAI', decimals: 18 },
  rpcUrls: ['https://rpc.gnosis.gateway.fm', 'https://rpc.gnosischain.com'],
  blockExplorerUrls: ['https://gnosisscan.io'],
};

export async function ensureGnosisChain(ethereum: WalletProvider): Promise<void> {
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: GNOSIS_CHAIN_ID_HEX }],
    });
  } catch (e: any) {
    const missing = e?.code === 4902;
    if (!missing) {
      throw e;
    }
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [GNOSIS_PARAMS],
    });
  }
}
