import { Contract, JsonRpcProvider } from 'ethers';

import { ensureGnosisChain } from '$lib/shared/integrations/chain/gnosis';
import { getWalletProvider } from '$lib/shared/integrations/wallet';

const SAFE_VIEW_ABI = [
  'function getOwners() view returns (address[])',
  'function getThreshold() view returns (uint256)',
];

async function getSafeInfo(safe: string): Promise<{ owners: string[]; threshold: number }> {
  const provider = new JsonRpcProvider('https://rpc.aboutcircles.com');
  const contract = new Contract(safe, SAFE_VIEW_ABI, provider);

  const owners = (await (contract.getOwners() as Promise<string[]>)).map((o) => o.toLowerCase());
  const thresholdRaw = await (contract.getThreshold() as Promise<bigint | number>);
  const threshold = typeof thresholdRaw === 'bigint' ? Number(thresholdRaw) : thresholdRaw;

  return { owners, threshold };
}

export async function assertWalletCanSignForSafe(safeAddress: string): Promise<{ owner: string }> {
  const ethereum = getWalletProvider();
  await ensureGnosisChain(ethereum);

  const accounts =
    ((await ethereum.request({ method: 'eth_requestAccounts' })) as string[] | undefined) ?? [];
  const owner = String(accounts[0] ?? '').toLowerCase();

  if (!/^0x[a-f0-9]{40}$/.test(owner)) {
    throw new Error('No EOA account unlocked in wallet');
  }

  const safe = String(safeAddress ?? '').toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(safe)) {
    throw new Error('Safe address is invalid');
  }
  if (owner === safe) {
    throw new Error('Selected account equals the Safe. Switch to a Safe owner EOA.');
  }

  const info = await getSafeInfo(safe);
  if (info.threshold !== 1) {
    throw new Error(`Safe threshold must be 1 for this flow (current: ${info.threshold}).`);
  }

  if (!new Set(info.owners).has(owner)) {
    throw new Error(`Connected account ${owner} is not an owner of Safe ${safe}.`);
  }

  return { owner };
}
