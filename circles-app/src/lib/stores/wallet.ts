import { writable } from "svelte/store";
import type { EthersContractRunner } from "@circles-sdk/adapter-ethers";
import { browser } from "$app/environment";

/**
 * A store that contains a signer instance or undefined
 */
export const wallet = writable<EthersContractRunner | undefined>();

if (browser) {
    const savedWallet = localStorage.getItem('wallet');
    if (savedWallet) {
        wallet.set(JSON.parse(savedWallet));
    }
}

wallet.subscribe((value) => {
    if (browser) {
        if (value) {
            localStorage.setItem('wallet', JSON.stringify(value));
        } else {
            localStorage.removeItem('wallet');
        }
    }
});