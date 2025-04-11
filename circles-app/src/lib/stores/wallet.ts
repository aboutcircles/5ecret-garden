import { writable } from 'svelte/store';
import { goto } from '$app/navigation';
import { avatar } from '$lib/stores/avatar';
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

export const wallet = writable<SdkContractRunner | undefined>();

export const GNOSIS_CHAIN_ID_DEC = 100n;

export async function initializeWallet(type: WalletType, avatarAddress?: Address): Promise<SdkContractRunner> {
  if (type === 'metamask') {
    const runner = new BrowserProviderContractRunner();
    await runner.init();
    return runner;
  } else if (type === 'safe' && !avatarAddress) {
    const runner = new BrowserProviderContractRunner();
    await runner.init();
    return runner;
  } else if ((type === 'safe' || type === 'safe+group') && avatarAddress) {
    const runner = new SafeSdkBrowserContractRunner();
    await runner.init(avatarAddress);
    return runner as SdkContractRunner;
  } else if (type === 'circles' && !avatarAddress) {
    const privateKey = CirclesStorage.getInstance().privateKey;
    if (!privateKey) {
      throw new Error('Private key not found in localStorage');
    }
    const rpcProvider = new JsonRpcProvider(gnosisConfig.circlesRpcUrl);
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
      gnosisConfig.circlesRpcUrl,
    );
    await runner.init(avatarAddress);
    return runner as SdkContractRunner;
  }
  throw new Error(`Unsupported wallet type: ${type}`);
}

export async function restoreWallet() {
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
      case 'metamask':
      case 'metamask+group':
      case 'safe':
      case 'safe+group':
      case 'circles':
      case 'circles+group':
        break;
      default:
        console.log('No "walletType" found in localStorage');
        await goto('/connect-wallet');
        break;
    }

    const savedAvatar = CirclesStorage.getInstance().avatar;
    let savedGroup: Address | undefined;
    if (walletTypeString.includes('+group')) {
      savedGroup = CirclesStorage.getInstance().group;
    } else {
      CirclesStorage.getInstance().data = { group: undefined };
    }

    const restoredWallet = await initializeWallet(
      walletType,
      savedAvatar,
    );

    if (!restoredWallet || !restoredWallet.address) {
      console.log('Failed to restore wallet or wallet address is undefined');
      await goto('/connect-wallet');
      return;
    }

    wallet.set(restoredWallet);

    const sdk = new Sdk(
      restoredWallet as SdkContractRunner,
      await getCirclesConfig(100n),
    );
    circles.set(sdk);

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
      avatar.set(await sdk.getAvatar(avatarToRestore));
    } else {
      await goto('/register');
    }
  } catch (error) {
    console.error('Failed to restore wallet:', error);
    clearSession();
  }
}

export async function clearSession() {
  avatar.set(undefined);
  wallet.set(undefined);
  circles.set(undefined);
  await goto('/connect-wallet');
}
