import { writable } from "svelte/store";
import type { EthersContractRunner } from "@circles-sdk/adapter-ethers";
import { browser } from "$app/environment";
import type { SafeSdkBrowserContractRunner, SafeSdkPrivateKeyContractRunner } from "@circles-sdk/adapter-safe";

/**
 * A store that contains a signer instance or undefined
 */

//TODO: create a common interface for more safety
type WalletRunner = EthersContractRunner | SafeSdkBrowserContractRunner | SafeSdkPrivateKeyContractRunner;
export const wallet = writable<WalletRunner | undefined>();

