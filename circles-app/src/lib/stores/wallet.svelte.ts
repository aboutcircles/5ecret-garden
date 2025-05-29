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
import type { WalletType } from '$lib/utils/walletType';
import type { Address } from '@circles-sdk/utils';
import { CirclesStorage } from '$lib/utils/storage';
import { groupMetrics } from './groupMetrics.svelte';
import { disconnect, getAccount, getConnectors, reconnect } from '@wagmi/core';
import { config } from '../../config';
import { settings } from './settings.svelte';

export const wallet = writable<SdkContractRunner | undefined>();

export const GNOSIS_CHAIN_ID_DEC = 100n;
export let signer: { address: Address | undefined } = $state({ address: undefined });

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

export async function initBrowserProviderContractRunner() {
  const runner = new BrowserProviderContractRunner();
  await runner.init();
  return runner;
}

export async function initializeContractRunner(type: WalletType, avatarAddress?: Address): Promise<SdkContractRunner> {
  if ((type === 'injected') || (type === 'safe' && !avatarAddress)) {
    return initBrowserProviderContractRunner();
  } else if ((type === 'safe' || type === 'safe+group') && avatarAddress) {
    const runner = new SafeSdkBrowserContractRunner();
    await runner.init(avatarAddress);
    return runner as SdkContractRunner;
  } else if (type === 'circles' && !avatarAddress) {
    const privateKey = CirclesStorage.getInstance().privateKey;
    if (!privateKey) {
      throw new Error('Private key not found in localStorage');
    }
    const rpcProvider = new JsonRpcProvider(settings.ring ? gnosisConfig.rings.circlesRpcUrl : gnosisConfig.production.circlesRpcUrl);
    const runner = new PrivateKeyContractRunner(rpcProvider, privateKey);
    await runner.init();
    return runner;
  } else if ((type === 'circles' || type === 'circles+group') && avatarAddress) {
    const privateKey = CirclesStorage.getInstance().privateKey;
    if (!privateKey) {
      throw new Error('Private key not found in localStorage');
    }
    const runner = new SafeSdkPrivateKeyContractRunner(
      privateKey,
      settings.ring ? gnosisConfig.rings.circlesRpcUrl : gnosisConfig.production.circlesRpcUrl,
    );
    await runner.init(avatarAddress);
    return runner as SdkContractRunner;
  }
  throw new Error(`Unsupported wallet type: ${type}`);
}

export async function restoreWallet() {
  signer.address = await getSigner();
  try {
    // The localstorage has a wallet type in one of the following formats:
    // * metamask
    // * safe
    // * circles
    //
    // If the user used the wallet to connect to a group. The format becomes:
    // * metamask+group
    // * safe+group
    // * circles+group
    const walletTypeString = CirclesStorage.getInstance().walletType ?? '';
    const walletType = walletTypeString.split('+')[0] as WalletType;
    switch (walletType) {
      case 'injected':
      case 'injected+group':
      case 'safe':
      case 'safe+group':
      case 'circles':
      case 'circles+group':
        break;
      default:
        throw new Error('No "walletType" found in localStorage');
    }

    const savedAvatar = CirclesStorage.getInstance().avatar;
    let savedGroup: Address | undefined;
    if (walletTypeString.includes('+group')) {
      savedGroup = CirclesStorage.getInstance().group;
      avatarState.isGroup = true;
    } else {
      CirclesStorage.getInstance().data = { group: undefined };
      avatarState.isGroup = false;
    }

    const restoredWallet = await initializeContractRunner(
      walletType,
      savedAvatar,
    );

    if (!restoredWallet || !restoredWallet.address) {
      throw new Error('Failed to restore wallet or wallet address is undefined');
    }

    wallet.set(restoredWallet);

    //TODO: cache environment on local storage
    const sdk = new Sdk(
      restoredWallet as SdkContractRunner,
      await getCirclesConfig(100n, settings.ring),
    );
    circles.set(sdk);

    if (avatarState.isGroup && savedGroup) {
      avatarState.groupType = await sdk.getGroupType(savedGroup);
    }

    const avatarToRestore =
      (savedGroup
        ?? savedAvatar
        ?? restoredWallet.address) as Address;


    console.log('savedAvatar', savedAvatar);
    console.log('savedGroup', savedGroup);
    console.log('restoredWallet.address', restoredWallet.address);
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
  wallet.set(undefined);
  circles.set(undefined);
  await goto('/');
}
