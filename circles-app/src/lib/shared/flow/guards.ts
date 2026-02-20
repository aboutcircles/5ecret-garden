import type { TokenBalanceRow } from '@circles-sdk/data';
import type { Profile } from '@circles-sdk/profiles';
import type { Avatar, Sdk } from '@circles-sdk/sdk';
import type { Address } from '@circles-sdk/utils';

export class FlowGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlowGuardError';
  }
}

function fail(message: string): never {
  throw new FlowGuardError(message);
}

export function requireCircles(circles: Sdk | undefined): Sdk {
  return circles ?? fail('Circles SDK not initialized');
}

export function requireAvatar(avatar: Avatar | undefined): Avatar {
  return avatar ?? fail('Avatar not initialized');
}

export function requireWalletAddress(
  address: Address | undefined,
  message = 'Wallet address not selected'
): Address {
  return address ?? fail(message);
}

export function requireSelectedAsset<TContext extends { selectedAsset?: TokenBalanceRow | undefined }>(
  context: TContext,
  message = 'Asset not selected'
): TokenBalanceRow {
  return context.selectedAsset ?? fail(message);
}

export function requireProfile(profile: Profile | undefined, message = 'Profile not initialized'): Profile {
  return profile ?? fail(message);
}

export function requireAmount(amount: number | undefined, message = 'Amount not specified'): number {
  if (amount === undefined || Number.isNaN(amount) || amount <= 0) {
    return fail(message);
  }
  return amount;
}
