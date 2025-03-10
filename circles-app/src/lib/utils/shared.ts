import { ethers } from 'ethers6';

export function getTimeAgo(unixTimestamp: number): string {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const secondsAgo = now - unixTimestamp;

  const minutes = Math.floor(secondsAgo / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

export function roundToDecimals(value?: number, decimals: number = 2): number {
  return (
    Math.floor((value ?? 0) * Math.pow(10, decimals)) / Math.pow(10, decimals)
  );
}

export function shortenAddress(address: string | undefined): string {
  if (!ethers.isAddress(address)) {
    return '';
  }
  const a = ethers.getAddress(address);
  return `${a.slice(0, 6)}...${a.slice(-6)}`;
}

export const staticTypes: Set<string> = new Set([
  'CrcV2_ERC20WrapperDeployed_Inflationary',
]);

export const crcTypes: Set<string> = new Set(['CrcV1_Signup']);
