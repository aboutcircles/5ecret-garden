import { writable } from 'svelte/store';
import { goto } from '$app/navigation';
import { avatarState } from '$lib/stores/avatar.svelte';
import { circles } from '$lib/stores/circles';
import {
  BrowserProviderContractRunner, PrivateKeyContractRunner,
} from '@circles-sdk/adapter-ethers';
import {
  SafeSdkBrowserContractRunner,
  SafeSdkPrivateKeyContractRunner,
} from '@circles-sdk/adapter-safe';
import { Sdk } from '@circles-sdk/sdk';
import { getCirclesConfig } from '$lib/utils/helpers';
import { gnosisConfig } from '$lib/circlesConfig';
import { JsonRpcProvider } from 'ethers';
import { type SdkContractRunner } from '@circles-sdk/adapter';
import type { Address } from '@circles-sdk/utils';
import { CirclesStorage } from '$lib/utils/storage';
import { groupMetrics } from './groupMetrics.svelte';
import { disconnect, getAccount, getConnectors, reconnect } from '@wagmi/core';
import { config } from '../../config';
import { settings } from './settings.svelte';
import type { GroupType } from '@circles-sdk/data';
import { privateKeyToAccount } from 'viem/accounts';

export const wallet = writable<SdkContractRunner | undefined>();

export const GNOSIS_CHAIN_ID_DEC = 100n;
export let signer: { address: Address | undefined, privateKey: string | undefined } = $state({ address: undefined, privateKey: undefined });

export async function getSigner() {
  const connectorId = localStorage.getItem('connectorId');
  const connector = getConnectors(config).find((c) => c.id == connectorId);
  if (!connector) {
    throw new Error('Connector not found');
  }
  await reconnect(config, {
    connectors: [connector],
  });

  const account = getAccount(config);
  return account.address?.toLowerCase() as Address;
}

export async function getSignerFromPk() {
  const privateKey = CirclesStorage.getInstance().privateKey;
  if (!privateKey) {
    return undefined;
  }
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return { address: account.address?.toLowerCase() as Address, privateKey: privateKey };
}

export async function initBrowserProviderContractRunner() {
  const runner = new BrowserProviderContractRunner();
  await runner.init();
  return runner;
}

export async function initPrivateKeyContractRunner(privateKey: string) {
  const rpcProvider = new JsonRpcProvider(settings.ring ? gnosisConfig.rings.circlesRpcUrl : gnosisConfig.production.circlesRpcUrl);
  const runner = new PrivateKeyContractRunner(rpcProvider, privateKey);
  await runner.init();
  return runner;
}

export async function initSafeSdkPrivateKeyContractRunner(privateKey: string, address: Address) {
  const runner = new SafeSdkPrivateKeyContractRunner(privateKey, settings.ring ? gnosisConfig.rings.circlesRpcUrl : gnosisConfig.production.circlesRpcUrl);
  await runner.init(address);
  return runner as SdkContractRunner;
}

export async function initSafeSdkBrowserContractRunner(address: Address) {
  const runner = new SafeSdkBrowserContractRunner();
  await runner.init(address);
  return runner as SdkContractRunner;
}

export async function restoreSession() {
  try {
    const privateKey = CirclesStorage.getInstance().privateKey;
    const savedAvatar = CirclesStorage.getInstance().avatar;
    const rings: boolean = CirclesStorage.getInstance().rings ? true : false;
    const legacy = CirclesStorage.getInstance().legacy;
    let runner: SdkContractRunner | undefined;
    if (privateKey && savedAvatar) {
      runner = await initSafeSdkPrivateKeyContractRunner(privateKey, savedAvatar);
    } else if (legacy) {
      runner = await initBrowserProviderContractRunner();
    } else if (savedAvatar) {
      runner = await initSafeSdkBrowserContractRunner(savedAvatar);
    } else {
      throw new Error('No private key, rings, legacy or saved avatar found in localStorage');
    }

    if (!runner) {
      throw new Error('Failed to restore contract runner');
    }

    signer.address = runner.address;

    const sdk = new Sdk(
      runner,
      await getCirclesConfig(100n, rings),
    );
    circles.set(sdk);
    let savedGroup = CirclesStorage.getInstance().group;
   

    if (savedGroup) {
      let groupType = CirclesStorage.getInstance().groupType;
      avatarState.isGroup = true;
      avatarState.groupType = groupType as GroupType;
    }

    const avatarToRestore =
      (savedGroup
        ?? savedAvatar
        ?? runner.address) as Address;


    console.log('savedAvatar', savedAvatar);
    console.log('savedGroup', savedGroup);
    console.log('restoredWallet.address', runner.address);
    console.log('-> avatarToRestore is: ', avatarToRestore);

    const avatarInfo = await sdk.data.getAvatarInfo(avatarToRestore);

    if (avatarInfo) {
      avatarState.avatar = await sdk.getAvatar(avatarToRestore);
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
  await disconnect(config, { connector: connector });
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
    priceHistoryMonth: undefined
  });
  Object.assign(avatarState, {
    avatar: undefined,
    isGroup: undefined,
    groupType: undefined,
    profile: undefined,
  });
  circles.set(undefined);
  CirclesStorage.getInstance().clear();
  await goto('/');
}
