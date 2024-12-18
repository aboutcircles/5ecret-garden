import { wallet } from '$lib/stores/wallet';
import { circles } from '$lib/stores/circles';
import { avatar } from '$lib/stores/avatar';
import { BrowserProviderContractRunner } from '@circles-sdk/adapter-ethers';
import { Sdk } from '@circles-sdk/sdk';
import { goto } from '$app/navigation';

const GNOSIS_CHAIN_ID_DEC = 100n;

export async function restoreWallet() {
    try {
        const savedWalletAddress = localStorage.getItem('wallet');

        if (!savedWalletAddress) {
            console.log('No wallet found in localStorage');
            return;
        }

        const restoredWallet = new BrowserProviderContractRunner();
        await restoredWallet.init();

        if (!restoredWallet || !restoredWallet.address) {
            console.log('Failed to restore wallet or wallet address is undefined');
            await goto('/connect-wallet');
            return;
        }

        wallet.set(restoredWallet);

        const network = await restoredWallet.provider?.getNetwork();
        if (!network || network.chainId !== GNOSIS_CHAIN_ID_DEC) {
            console.log('Wrong network or failed to get network');
            return;
        }

        const sdk = new Sdk(restoredWallet, await getCirclesConfig(network.chainId));
        circles.set(sdk);

        const walletAddress = restoredWallet.address;
        const avatarInfo = await sdk.data.getAvatarInfo(walletAddress);

        if (avatarInfo) {
            avatar.set(await sdk.getAvatar(walletAddress));
            // await goto('/dashboard');
        } else {
            await goto('/register');
        }

    } catch (error) {
        console.error('Failed to restore wallet:', error);
        localStorage.removeItem('wallet');
        await goto('/connect-wallet');
    }
}

async function getCirclesConfig(chainId: bigint) {
    if (chainId === 100n) {
        return (await import('$lib/chiadoConfig')).gnosisConfig;
    } else if (chainId === 10200n) {
        return (await import('$lib/chiadoConfig')).chiadoConfig;
    }
    throw new Error(`Unsupported chain-id: ${chainId}`);
}
