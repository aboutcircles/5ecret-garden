// src/lib/auth/signin.ts
import { requestChallenge, verifyChallenge, setAuthToken } from './siwe';
import { utf8ToBytes } from '$lib/safeSigner/keccak';
import { createMetaMaskSafeSigner } from '$lib/safeSigner/signers/metamask';
import type { Address, EIP1193Provider } from '$lib/safeSigner/types';
import { normalizeAddress } from '$lib/offers/adapters';
import { GNOSIS_CHAIN_ID_HEX, GNOSIS_CHAIN_ID_NUM } from '$lib/config/market';

export async function signInWithWallet() {
  const anyWindow = window as any;
  if (!anyWindow?.ethereum) throw new Error('No wallet found');
  // ethers v6 BrowserProvider usage in this codebase is abstracted; to keep deps minimal,
  // use the low-level personal_sign to avoid importing ethers here.

  // Request accounts
  const [address] = await anyWindow.ethereum.request({ method: 'eth_requestAccounts' });
  // Get chainId (hex) and convert to number
  const chainHex: string = await anyWindow.ethereum.request({ method: 'eth_chainId' });
  const chainId = parseInt(chainHex, 16);

  const ch = await requestChallenge(address, chainId);

  // personal_sign expects params: [data, address]
  const signature: string = await anyWindow.ethereum.request({
    method: 'personal_sign',
    params: [ch.message, address],
  });

  const vr = await verifyChallenge(ch.challengeId, signature);
  setAuthToken(vr.token, vr.expiresIn, vr.address, vr.chainId);
  return { address: vr.address, chainId: vr.chainId };
}

async function ensureGnosisChain(provider: EIP1193Provider): Promise<void> {
  const targetChain = GNOSIS_CHAIN_ID_HEX;
  const current = (await provider.request({ method: 'eth_chainId' })) as string;
  if (current?.toLowerCase() === targetChain.toLowerCase()) return;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetChain }],
    });
  } catch (e: any) {
    if (e?.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: targetChain,
          chainName: 'Gnosis Chain',
          nativeCurrency: { name: 'xDAI', symbol: 'XDAI', decimals: 18 },
          rpcUrls: ['https://rpc.gnosis.gateway.fm', 'https://rpc.gnosischain.com'],
          blockExplorerUrls: ['https://gnosisscan.io'],
        }],
      });
    } else {
      throw e;
    }
  }
}

export async function signInWithSafe(rawSafeAddress: string) {
  const anyWindow = window as any;
  if (!anyWindow?.ethereum) throw new Error('No wallet found');

  const provider = anyWindow.ethereum as EIP1193Provider;

  const safeAddress = normalizeAddress(rawSafeAddress) as Address;

  await ensureGnosisChain(provider);

  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
  const owner = (accounts?.[0] ?? '').toLowerCase() as Address;
  if (!/^0x[a-f0-9]{40}$/.test(owner)) {
    throw new Error('No EOA account unlocked in wallet');
  }

  const chainHex = (await provider.request({ method: 'eth_chainId' })) as string;
  const chainId = parseInt(chainHex, 16);
  if (chainId !== GNOSIS_CHAIN_ID_NUM) {
    throw new Error(`Unexpected chainId ${chainId}, expected ${GNOSIS_CHAIN_ID_NUM}`);
  }

  const ch = await requestChallenge(safeAddress, chainId);

  const payloadBytes = utf8ToBytes(ch.message);

  const safeSigner = createMetaMaskSafeSigner({
    ethereum: provider,
    account: owner,
    chainId: BigInt(chainId),
    safeAddress,
    enforceChainId: true,
  });

  const signature = await safeSigner.sign(payloadBytes);

  const vr = await verifyChallenge(ch.challengeId, signature);
  setAuthToken(vr.token, vr.expiresIn, vr.address, vr.chainId);
  return { address: vr.address, chainId: vr.chainId };
}
