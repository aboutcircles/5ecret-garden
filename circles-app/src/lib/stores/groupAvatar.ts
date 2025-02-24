import { derived, get } from 'svelte/store';
import { ethers, type ContractRunner } from 'ethers6';
import groupABI from '$lib/utils/abi/group';
import { wallet } from '$lib/stores/wallet';
import { avatar } from '$lib/stores/avatar';

export const groupAvatarContract = derived(
  [avatar, wallet],
  ([$avatar, $wallet]) =>
    $avatar && $wallet
      ? new ethers.Contract(
          $avatar.address,
          groupABI,
          $wallet as ContractRunner
        )
      : null
);

const sanitizeAddresses = (addrStr: string): string[] => {
  const addresses = addrStr
    .split(',')
    .map((addr) => addr.trim())
    .filter((addr) => ethers.isAddress(addr));
  return addresses;
};

export async function addMembers(addrStr: string) {
  const addresses = sanitizeAddresses(addrStr);
  if (addresses.length === 0) {
    throw new Error('No valid addresses provided');
  }

  const contract = get(groupAvatarContract);
  if (!contract) throw new Error('Contract not initialized');

  try {
    const tx = await contract.trustBatch(addresses, 9999999999);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error adding member:', error);
    throw error;
  }
}

export async function removeMembers(addrStr: string) {
  const addresses = sanitizeAddresses(addrStr);
  if (addresses.length === 0) {
    throw new Error('No valid addresses provided');
  }

  const contract = get(groupAvatarContract);
  if (!contract) throw new Error('Contract not initialized');

  try {
    const tx = await contract.trustBatch(addresses, 0);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Error adding member:', error);
    throw error;
  }
}
