import { writable } from 'svelte/store';
import { goto } from '$app/navigation';
import { avatar } from '$lib/stores/avatar';
import { circles } from '$lib/stores/circles';
import {
  BrowserProviderContractRunner, PrivateKeyContractRunner,
  SdkContractRunnerWrapper,
} from '@circles-sdk/adapter-ethers';
import {
  SafeSdkBrowserContractRunner,
  SafeSdkPrivateKeyContractRunner,
} from '@circles-sdk/adapter-safe';
import { Sdk } from '@circles-sdk/sdk';
import { getCirclesConfig } from '$lib/utils/helpers';
import { gnosisConfig } from '$lib/chiadoConfig';
import { JsonRpcProvider } from 'ethers';
import { type SdkContractRunner } from '@circles-sdk/adapter';
import type { WalletType } from '$lib/utils/walletType';
import type { Address } from '@circles-sdk/utils';

export const wallet = writable<SdkContractRunner | undefined>();

export const GNOSIS_CHAIN_ID_DEC = 100n;

export async function initializeWallet(type: WalletType, address?: Address): Promise<SdkContractRunner> {
  if (type === 'metamask') {
    const runner = new BrowserProviderContractRunner();
    await runner.init();
    return runner;
  } else if (type === 'safe' && !address) {
    const runner = new BrowserProviderContractRunner();
    await runner.init();
    return runner;
  } else if (type === 'safe' && address) {
    const runner = new SafeSdkBrowserContractRunner();
    await runner.init(address);
    return runner as SdkContractRunner;
  } else if (type === 'circles' && !address) {
    const privateKey = localStorage.getItem('privateKey');
    if (!privateKey) {
      throw new Error('Private key not found in localStorage');
    }
    const rpcProvider = new JsonRpcProvider(gnosisConfig.circlesRpcUrl);
    const runner = new PrivateKeyContractRunner(rpcProvider, privateKey);
    await runner.init();
    return runner;
  } else if (type === 'circles' && address) {
    const privateKey = localStorage.getItem('privateKey');
    if (!privateKey) {
      throw new Error('Private key not found in localStorage');
    }
    const runner = new SafeSdkPrivateKeyContractRunner(
      privateKey,
      gnosisConfig.circlesRpcUrl,
    );
    await runner.init(address);
    return runner as SdkContractRunner;
  }
  throw new Error(`Unsupported wallet type: ${type}`);
}

export async function restoreWallet() {
  try {
    let walletType: WalletType = localStorage.getItem('walletType') as WalletType;
    switch (walletType) {
      case 'metamask':
      case 'safe':
      case 'circles':
        break;
      default:
        console.log('No "walletType" found in localStorage');
        await goto('/connect-wallet');
        break;
    }

    const savedAvatar = localStorage.getItem('avatar') as `0x${string}`;
    const restoredWallet = await initializeWallet(
      walletType!,
      savedAvatar
    );

    if (!restoredWallet || !restoredWallet.address) {
      console.log('Failed to restore wallet or wallet address is undefined');
      await goto('/connect-wallet');
      return;
    }

    wallet.set(restoredWallet);

    const sdk = new Sdk(
      restoredWallet as SdkContractRunnerWrapper,
      await getCirclesConfig(100n),
    );
    circles.set(sdk);

    const avatarInfo = await sdk.data.getAvatarInfo(
      savedAvatar !== null ? savedAvatar : restoredWallet.address,
    );

    if (avatarInfo) {
      avatar.set(
        await sdk.getAvatar(
          savedAvatar !== null ? savedAvatar : restoredWallet.address,
        ),
      );
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
