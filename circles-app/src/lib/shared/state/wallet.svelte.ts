import {writable} from 'svelte/store';
import {goto} from '$app/navigation';
import {avatarState} from '$lib/shared/state/avatar.svelte';
import {circles} from '$lib/shared/state/circles';
import {
    BrowserProviderContractRunner, PrivateKeyContractRunner,
} from '@circles-sdk/adapter-ethers';
import {
    SafeSdkBrowserContractRunner,
    SafeSdkPrivateKeyContractRunner,
} from '@circles-sdk/adapter-safe';
import {Sdk} from '@circles-sdk/sdk';
import {getCirclesConfig} from '$lib/shared/utils/helpers';
import {gnosisConfig} from '$lib/shared/config/circles';
import {JsonRpcProvider} from 'ethers';
import {type SdkContractRunner} from '@circles-sdk/adapter';
import type {Address} from '@circles-sdk/utils';
import {CirclesStorage} from '$lib/shared/utils/storage';
import {groupMetrics} from '$lib/areas/groups/state';
import { disconnect, getConnectors, reconnect, getAccount } from '@wagmi/core';
import {config} from '../../../config';
import {settings} from './settings.svelte';
import type {GroupType} from '@circles-sdk/data';
import {privateKeyToAccount} from 'viem/accounts';
import { clearConnectorId, getConnectorId } from '$lib/shared/state/connector';
import { createAvatarDataSource } from '$lib/shared/data/circles/avatarDataSource';
import { getWalletProvider } from '$lib/shared/integrations/wallet';

export const wallet = writable<SdkContractRunner | undefined>();

export const GNOSIS_CHAIN_ID_DEC = 100n;
export let signer: { address: Address | undefined, privateKey: string | undefined } = $state({
    address: undefined,
    privateKey: undefined
});

export async function getSigner() {
    const connectorId = getConnectorId();
    const connectors = getConnectors(config);

    // Try stored connector first if present; otherwise, try a generic reconnect
    const connector = connectors.find((c) => c.id == connectorId);

    if (connector) {
        await reconnect(config, {connectors: [connector]});
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
    return {address: account.address?.toLowerCase() as Address, privateKey: privateKey};
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
    // Ensure adapter-safe sees the same injected provider that matches
    // the currently selected wagmi connector (MetaMask/Rabby, etc.).
    if (typeof window !== 'undefined') {
        try {
            const descriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');
            const canAssignEthereum = !descriptor || Boolean(descriptor.writable || descriptor.set);

            if (canAssignEthereum) {
                (window as any).ethereum = getWalletProvider() as any;
            }
        } catch (error) {
            // Some wallets expose window.ethereum as getter-only.
            // In that case, fall back to the default injected provider
            // instead of crashing wallet restore/connect.
            // Keep this quiet in production to avoid noisy console output.
            console.debug('Could not override window.ethereum, using default injected provider.', error);
        }
    }
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
            // Safe + PK path
            runner = await initSafeSdkPrivateKeyContractRunner(privateKey, savedAvatar);
            const account = privateKeyToAccount(privateKey as `0x${string}`);
            signer.address = account.address?.toLowerCase() as Address;
            signer.privateKey = privateKey;
        } else if (legacy) {
            // Legacy browser provider (EOA flow)
            runner = await initBrowserProviderContractRunner();
            signer.privateKey = undefined;

            // Best-effort resolve the EOA immediately
            try {
                const addr = await getSigner();
                if (addr) {
                    signer.address = addr;
                }
            } catch (e) {
                console.warn('getSigner failed during legacy restore:', e);
            }
        } else if (savedAvatar) {
            // Safe + browser provider (EOA != Safe)
            runner = await initSafeSdkBrowserContractRunner(savedAvatar);
            signer.privateKey = undefined;

            // IMPORTANT: resolve current EOA eagerly so features that need the owner have it
            try {
                const addr = await getSigner();
                if (addr) {
                    signer.address = addr;
                }
            } catch (e) {
                console.warn('getSigner failed during Safe restore:', e);
            }
        } else {
            throw new Error('No private key, rings, legacy or saved avatar found in localStorage');
        }

        if (!runner) {
            throw new Error('Failed to restore contract runner');
        }

        wallet.set(runner);

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

        const avatarDataSource = createAvatarDataSource(sdk);
        const avatarInfo = await avatarDataSource.getAvatarInfo(avatarToRestore);

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
    const connectorId = getConnectorId();
    const connector = getConnectors(config).find((c) => c.id == connectorId);
    if (connector) {
        await disconnect(config, {connector: connector});
    }
    clearConnectorId();
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
    Object.assign(signer, {
        address: undefined,
        privateKey: undefined,
    });
    circles.set(undefined);
    CirclesStorage.getInstance().clear();
    await goto('/');
}