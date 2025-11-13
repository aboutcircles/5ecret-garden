import { writable } from 'svelte/store';
import { goto } from '$app/navigation';
import { avatarState } from '$lib/stores/avatar.svelte';
import { circles } from '$lib/stores/circles';
import { Sdk } from '@aboutcircles/sdk';
import {
  SafeContractRunner,
  SafeBrowserRunner,
} from '@aboutcircles/sdk-runner';
import { circlesConfig } from '@aboutcircles/sdk-core';
import { getCirclesConfig } from '$lib/utils/helpers';
import { gnosisConfig } from '$lib/circlesConfig';
import { JsonRpcProvider } from 'ethers';
import { type ContractRunner } from '@aboutcircles/sdk-types';
import type { Address } from '@aboutcircles/sdk-types';
import { CirclesStorage } from '$lib/utils/storage';
import { groupMetrics } from './groupMetrics.svelte';
import { disconnect, getAccount, getConnectors, reconnect } from '@wagmi/core';
import { config } from '../../config';
import { settings } from './settings.svelte';
import type { GroupType } from '@aboutcircles/sdk-types';
import { privateKeyToAccount } from 'viem/accounts';
import { gnosis } from 'viem/chains';

export const wallet = writable<ContractRunner | undefined>();

export const GNOSIS_CHAIN_ID_DEC = 100n;
export let signer: {
  address: Address | undefined;
  privateKey: string | undefined;
} = $state({
  address: undefined,
  privateKey: undefined,
});

export async function getSigner() {
  const connectorId = localStorage.getItem('connectorId');
  const connectors = getConnectors(config);

  // Try stored connector first if present; otherwise, try a generic reconnect
  const connector = connectors.find((c) => c.id == connectorId);

  if (connector) {
    await reconnect(config, { connectors: [connector] });
  } else {
    // Fall back to generic reconnect (e.g., injected in mobile in-app browsers)
    await reconnect(config);
  }

  const account = getAccount(config);
  // Return undefined instead of throwing; callers can decide what to do
  return account.address?.toLowerCase() as Address | undefined;
}

export async function getSignerFromPk() {
  const privateKey = CirclesStorage.getInstance().privateKey;
  if (!privateKey) {
    return undefined;
  }
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return {
    address: account.address?.toLowerCase() as Address,
    privateKey: privateKey,
  };
}

// New runner initialization functions using @markfender/runner
export async function initNewSafeContractRunner(
  privateKey: string,
  safeAddress: Address
) {
  const rpcUrl = settings.ring
    ? gnosisConfig.rings.circlesRpcUrl
    : gnosisConfig.production.circlesRpcUrl;
  const runner = await SafeContractRunner.create(
    rpcUrl,
    privateKey as `0x${string}`,
    safeAddress,
    gnosis
  );
  return runner;
}

export async function initNewSafeBrowserRunner(safeAddress: Address) {
  const rpcUrl = settings.ring
    ? gnosisConfig.rings.circlesRpcUrl
    : gnosisConfig.production.circlesRpcUrl;

  if (!window.ethereum) {
    throw new Error('No ethereum provider found');
  }

  const runner = await SafeBrowserRunner.create(
    rpcUrl,
    window.ethereum,
    safeAddress,
    gnosis
  );
  return runner;
}
// @todo check
export async function restoreSession() {
  try {
    const privateKey = CirclesStorage.getInstance().privateKey;
    const savedAvatar = CirclesStorage.getInstance().avatar;
    const rings: boolean = CirclesStorage.getInstance().rings ? true : false;

    let newRunner;
    let sdk: Sdk;

    if (privateKey && savedAvatar) {
      // Safe + PK path - use NEW SDK with runner
      newRunner = await initNewSafeContractRunner(
        privateKey,
        savedAvatar as Address
      );

      const account = privateKeyToAccount(privateKey as `0x${string}`);
      signer.address = account.address?.toLowerCase() as Address;
      signer.privateKey = privateKey;

      // Use the new SDK with runner - use default config for now (rings not supported yet in new SDK)
      sdk = new Sdk(circlesConfig[100], newRunner);
    } else if (savedAvatar) {
      // Safe + browser provider (EOA != Safe) - use NEW SDK with browser runner
      newRunner = await initNewSafeBrowserRunner(savedAvatar as Address);
      signer.privateKey = undefined;

      // Use the new SDK with runner - use default config for now (rings not supported yet in new SDK)
      sdk = new Sdk(circlesConfig[100], newRunner);
    } else {
      throw new Error('No private key or saved avatar found in localStorage');
    }

    if (!sdk) {
      throw new Error('Failed to initialize SDK');
    }

    circles.set(sdk);

    let savedGroup = CirclesStorage.getInstance().group;

    const avatarToRestore = (savedGroup ??
      savedAvatar ??
      (newRunner?.address || sdk.contractRunner?.address)) as Address;

    // Get avatar from SDK - returns HumanAvatar, OrganisationAvatar, or BaseGroupAvatar
    // Enable auto event subscription for reactive balance/transaction updates
    let avatar = await sdk.getAvatar(avatarToRestore, true);

    if (avatar) {
      avatarState.avatar = avatar;

      // Detect avatar type from the avatarInfo returned by SDK
      const avatarType = (avatar.avatarInfo as any)?.type;

      if (avatarType === 'CrcV2_RegisterGroup') {
        avatarState.isGroup = true;
        avatarState.isHuman = false;
        // Try to get group type from storage or avatarInfo
        avatarState.groupType =
          (CirclesStorage.getInstance().groupType as GroupType) ||
          'Standard';
      } else if (avatarType === 'CrcV2_RegisterOrganization') {
        avatarState.isGroup = false;
        avatarState.isHuman = false;
        avatarState.groupType = undefined;
      } else {
        // Default to human
        avatarState.isGroup = false;
        avatarState.isHuman = true;
        avatarState.groupType = undefined;
      }
    } else {
      await goto('/register');
    }
  } catch (error) {
    console.error('Failed to restore wallet:', error);
    clearSession();
  }
}

export async function clearSession() {
  //TODO: create a state for the connector
  const connectorId = localStorage.getItem('connectorId');
  const connector = getConnectors(config).find((c) => c.id == connectorId);
  if (connector) {
    await disconnect(config, { connector: connector });
    localStorage.removeItem('connectorId');
  }
  Object.assign(groupMetrics, {
    memberCountPerHour: undefined,
    memberCountPerDay: undefined,
    mintRedeemPerHour: undefined,
    mintRedeemPerDay: undefined,
    wrapUnwrapPerHour: undefined,
    wrapUnwrapPerDay: undefined,
    collateralInTreasury: undefined,
    tokenHolderBalance: undefined,
    erc20Token: undefined,
    priceHistoryWeek: undefined,
    priceHistoryMonth: undefined,
  });
  Object.assign(avatarState, {
    avatar: undefined,
    isGroup: undefined,
    isHuman: undefined,
    groupType: undefined,
    profile: undefined,
  });
  Object.assign(signer, {
    address: undefined,
    privateKey: undefined,
  });
  circles.set(undefined);
  CirclesStorage.getInstance().clear();
  await goto('/');
}
