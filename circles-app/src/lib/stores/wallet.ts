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
import { gnosisConfig } from '$lib/circlesConfig';
import { JsonRpcProvider } from 'ethers';
import { type SdkContractRunner } from '@circles-sdk/adapter';
import type { WalletType } from '$lib/utils/walletType';
import type { Address } from '@circles-sdk/utils';

export const wallet = writable<SdkContractRunner | undefined>();

export const GNOSIS_CHAIN_ID_DEC = 100n;

export async function initializeWallet(type: WalletType, address: Address = '0x0'): Promise<SdkContractRunner> {
  localStorage.setItem('walletType', type);
  console.log('Initializing wallet of type:', type);
  let runner;
  switch (type) {
    case 'injected':
      runner = new BrowserProviderContractRunner();
      await runner.init();
      if (runner.address) {
        localStorage.setItem('wallet', runner.address);
      } else {
        throw new Error('Runner address is undefined');
      }
      break;
    case 'safe':
      runner = new SafeSdkBrowserContractRunner();
      await runner.init(address);
      localStorage.setItem('wallet', address);
      break;
    case 'circles':
      console.log('Initializing Circles wallet');
      if (address != '0x0') {
        const privateKey = localStorage.getItem('privateKey');
        if (!privateKey) {
          throw new Error('Private key not found in localStorage');
        }
        runner = new SafeSdkPrivateKeyContractRunner(
          privateKey,
          gnosisConfig.circlesRpcUrl,
        );
        await runner.init(address);
      } else {
        const privateKey = localStorage.getItem('privateKey');
        if (!privateKey) {
          throw new Error('Private key not found in localStorage');
        }
        const rpcProvider = new JsonRpcProvider(gnosisConfig.circlesRpcUrl);
        runner = new PrivateKeyContractRunner(rpcProvider, privateKey);
        await runner.init();
      }
      break;
    default:
  } 
  return runner as SdkContractRunner;
}

export async function restoreWallet() {
  try {
    let walletType: WalletType = localStorage.getItem('walletType') as WalletType;
    switch (walletType) {
      case 'injected':
      case 'safe':
      case 'circles':
        break;
      default:
        console.log('No "walletType" found in localStorage');
        await clearSession();
        break;
    }

    const savedWalletAddress = localStorage.getItem('wallet') as `0x${string}`;
    const savedAvatar = localStorage.getItem('avatar') as `0x${string}`;
    const restoredWallet = await initializeWallet(
      walletType!,
      savedWalletAddress
    );

    if (!restoredWallet || !restoredWallet.address) {
      console.log('Failed to restore wallet or wallet address is undefined');
      await clearSession();
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
  localStorage.clear();
  avatar.set(undefined);
  wallet.set(undefined);
  circles.set(undefined);
  await goto('/connect-wallet');
}
