import { describe, expect, it } from 'vitest';
import {
  FlowGuardError,
  requireAmount,
  requireAvatar,
  requireCircles,
  requireProfile,
  requireSelectedAsset,
  requireWalletAddress,
} from '$lib/shared/flow/guards';

describe('flow guards', () => {
  it('returns values when requirements are satisfied', () => {
    const sdk = {} as any;
    const avatar = {} as any;
    const address = '0x0000000000000000000000000000000000000001' as any;
    const asset = { tokenAddress: address } as any;
    const profile = { name: 'Alice' } as any;

    expect(requireCircles(sdk)).toBe(sdk);
    expect(requireAvatar(avatar)).toBe(avatar);
    expect(requireWalletAddress(address)).toBe(address);
    expect(requireSelectedAsset({ selectedAsset: asset })).toBe(asset);
    expect(requireProfile(profile)).toBe(profile);
    expect(requireAmount(1)).toBe(1);
  });

  it('throws FlowGuardError with default messages on missing values', () => {
    expect(() => requireCircles(undefined)).toThrow(FlowGuardError);
    expect(() => requireCircles(undefined)).toThrow('Circles SDK not initialized');

    expect(() => requireAvatar(undefined)).toThrow(FlowGuardError);
    expect(() => requireAvatar(undefined)).toThrow('Avatar not initialized');

    expect(() => requireWalletAddress(undefined)).toThrow(FlowGuardError);
    expect(() => requireWalletAddress(undefined)).toThrow('Wallet address not selected');

    expect(() => requireSelectedAsset({ selectedAsset: undefined })).toThrow(FlowGuardError);
    expect(() => requireSelectedAsset({ selectedAsset: undefined })).toThrow('Asset not selected');

    expect(() => requireProfile(undefined)).toThrow(FlowGuardError);
    expect(() => requireProfile(undefined)).toThrow('Profile not initialized');

    expect(() => requireAmount(undefined)).toThrow(FlowGuardError);
    expect(() => requireAmount(undefined)).toThrow('Amount not specified');
    expect(() => requireAmount(0)).toThrow('Amount not specified');
    expect(() => requireAmount(Number.NaN)).toThrow('Amount not specified');
  });

  it('supports custom guard messages', () => {
    expect(() => requireWalletAddress(undefined, 'No address selected')).toThrow('No address selected');
    expect(() => requireSelectedAsset({ selectedAsset: undefined }, 'No asset selected')).toThrow('No asset selected');
    expect(() => requireProfile(undefined, 'No profile selected')).toThrow('No profile selected');
    expect(() => requireAmount(undefined, 'No amount entered')).toThrow('No amount entered');
  });
});
