// src/lib/auth/signin.ts
import { requestChallenge, verifyChallenge, setAuthToken } from './siwe';

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
