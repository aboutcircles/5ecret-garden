import { writable } from "svelte/store";
import { goto } from "$app/navigation";
import { avatar } from "$lib/stores/avatar";
import { circles } from "$lib/stores/circles";
import { BrowserProviderContractRunner } from "@circles-sdk/adapter-ethers";
import { SafeSdkBrowserContractRunner, SafeSdkPrivateKeyContractRunner } from "@circles-sdk/adapter-safe";
import { Sdk } from "@circles-sdk/sdk";
import { getCirclesConfig } from "$lib/utils/helpers";

type WalletRunner = BrowserProviderContractRunner | SafeSdkBrowserContractRunner | SafeSdkPrivateKeyContractRunner;

export const wallet = writable<WalletRunner | undefined>();

export const GNOSIS_CHAIN_ID_DEC = 100n;

export async function initializeWallet(type: string, address?: `0x${string}`) {
    localStorage.setItem("walletType", type);
    if (type === "metamask") {
        const runner = new BrowserProviderContractRunner();
        await runner.init();
        localStorage.setItem("wallet", JSON.stringify(runner.address!));
        return runner;
    } else if (type === "safe" && address) {
        localStorage.setItem("wallet", address);
        const runner = new SafeSdkBrowserContractRunner();
        await runner.init(address);
        return runner;
    }
    throw new Error(`Unsupported wallet type: ${type}`);
}

export async function restoreWallet() {
    try {
        const walletType = localStorage.getItem("walletType");
        const savedWalletAddress = localStorage.getItem("wallet") as `0x${string}`;
        const savedAvatar = localStorage.getItem("avatar") as `0x${string}`;

        if (!walletType || !savedWalletAddress) {
            console.log("No wallet found in localStorage");
            await goto("/connect-wallet");
            return;
        }

        const restoredWallet = await initializeWallet(walletType, savedWalletAddress);

        if (!restoredWallet || !restoredWallet.address) {
            console.log("Failed to restore wallet or wallet address is undefined");
            await goto("/connect-wallet");
            return;
        }

        wallet.set(restoredWallet);

        const network = await restoredWallet.provider?.getNetwork();
        if (!network || network.chainId !== GNOSIS_CHAIN_ID_DEC) {
            console.log("Wrong network or failed to get network");
            return;
        }

        const sdk = new Sdk(restoredWallet, await getCirclesConfig(network.chainId));
        circles.set(sdk);

        const avatarInfo = await sdk.data.getAvatarInfo(savedAvatar !== null ? savedAvatar : restoredWallet.address);

        if (avatarInfo) {
            console.log("Wallet restored");
            avatar.set(await sdk.getAvatar(savedAvatar !== null ? savedAvatar : restoredWallet.address));
        } else {
            await goto("/register");
        }
    } catch (error) {
        console.error("Failed to restore wallet:", error);
        clearSession();
    }
}

export async function clearSession() {
    localStorage.clear();
    avatar.set(undefined);
    wallet.set(undefined);
    circles.set(undefined);
    localStorage.removeItem('wallet');
    localStorage.removeItem('avatar');
    await goto("/connect-wallet");
    console.log("User session cleared");
}
