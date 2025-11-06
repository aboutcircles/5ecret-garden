import {writable} from 'svelte/store';
import {goto} from '$app/navigation';
import {avatarState} from '$lib/stores/avatar.svelte';
import {circles} from '$lib/stores/circles';
import {
    BrowserProviderContractRunner, PrivateKeyContractRunner,
} from '@circles-sdk/adapter-ethers';
import {
    SafeSdkBrowserContractRunner,
    SafeSdkPrivateKeyContractRunner,
} from '@circles-sdk/adapter-safe';
import {Sdk as OldSdk} from '@circles-sdk/sdk';
import {Sdk} from '@circles-sdk-v2/sdk';
import {SafeContractRunner, SafeBrowserRunner} from '@circles-sdk-v2/runner';
import {circlesConfig} from '@circles-sdk-v2/core';
import {getCirclesConfig} from '$lib/utils/helpers';
import {gnosisConfig} from '$lib/circlesConfig';
import {JsonRpcProvider} from 'ethers';
import {type SdkContractRunner} from '@circles-sdk/adapter';
import type {Address} from '@circles-sdk/utils';
import type {Address as ViemAddress} from 'viem';
import {CirclesStorage} from '$lib/utils/storage';
import {groupMetrics} from './groupMetrics.svelte';
import {disconnect, getAccount, getConnectors, reconnect} from '@wagmi/core';
import {config} from '../../config';
import {settings} from './settings.svelte';
import type {GroupType} from '@circles-sdk/data';
import {privateKeyToAccount} from 'viem/accounts';
import {createPublicClient, http} from 'viem';
import {gnosis} from 'viem/chains';

export const wallet = writable<SdkContractRunner | undefined>();

export const GNOSIS_CHAIN_ID_DEC = 100n;
export let signer: { address: Address | undefined, privateKey: string | undefined } = $state({
    address: undefined,
    privateKey: undefined
});

export async function getSigner() {
    const connectorId = localStorage.getItem('connectorId');
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
    const runner = new SafeSdkBrowserContractRunner();
    await runner.init(address);
    return runner as SdkContractRunner;
}

// New runner initialization functions using @markfender/runner
export async function initNewSafeContractRunner(privateKey: string, safeAddress: ViemAddress) {
    const rpcUrl = settings.ring ? gnosisConfig.rings.circlesRpcUrl : gnosisConfig.production.circlesRpcUrl;

    const publicClient = createPublicClient({
        chain: gnosis,
        transport: http(rpcUrl),
    });

    const runner = new SafeContractRunner(
        publicClient,
        privateKey as `0x${string}`,
        rpcUrl,
        safeAddress
    );

    await runner.init();
    return runner;
}

export async function initNewSafeBrowserRunner(safeAddress: ViemAddress) {
    const rpcUrl = settings.ring ? gnosisConfig.rings.circlesRpcUrl : gnosisConfig.production.circlesRpcUrl;

    const publicClient = createPublicClient({
        chain: gnosis,
        transport: http(rpcUrl),
    });

    if (!window.ethereum) {
        throw new Error('No ethereum provider found');
    }

    const runner = new SafeBrowserRunner(
        publicClient,
        window.ethereum,
        safeAddress
    );

    await runner.init();
    return runner;
}
// @todo check
export async function restoreSession() {
    try {
        const privateKey = CirclesStorage.getInstance().privateKey;
        const savedAvatar = CirclesStorage.getInstance().avatar;
        const rings: boolean = CirclesStorage.getInstance().rings ? true : false;
        const legacy = CirclesStorage.getInstance().legacy;

        let newRunner;
        let sdk: Sdk;

        if (privateKey && savedAvatar) {
            // Safe + PK path - use NEW SDK with runner
            newRunner = await initNewSafeContractRunner(privateKey, savedAvatar as ViemAddress);

            const account = privateKeyToAccount(privateKey as `0x${string}`);
            signer.address = account.address?.toLowerCase() as Address;
            signer.privateKey = privateKey;

            // Use the new SDK with runner - use default config for now (rings not supported yet in new SDK)
            sdk = new Sdk(circlesConfig[100], newRunner);

        } else if (savedAvatar) {
            // Safe + browser provider (EOA != Safe) - use NEW SDK with browser runner
            newRunner = await initNewSafeBrowserRunner(savedAvatar as ViemAddress);
            signer.privateKey = undefined;

            // Use the new SDK with runner - use default config for now (rings not supported yet in new SDK)
            sdk = new Sdk(circlesConfig[100], newRunner);

        } else {
            throw new Error('No private key, rings, legacy or saved avatar found in localStorage');
        }

        if (!sdk) {
            throw new Error('Failed to initialize SDK');
        }

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
                ?? (newRunner?.address || sdk.contractRunner?.address)) as Address;

        // Check if avatar exists - handle both old and new SDK
        let avatarInfo = await sdk.getAvatar(avatarToRestore);
        if (avatarInfo) {
            avatarState.avatar = avatarInfo;
            avatarState.isHuman = !!avatarInfo.avatarInfo?.isHuman;
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
        await disconnect(config, {connector: connector});
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
        priceHistoryMonth: undefined
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
