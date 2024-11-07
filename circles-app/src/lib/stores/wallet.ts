import {writable} from "svelte/store";
import type {EthersContractRunner} from "@circles-sdk/adapter-ethers";

/**
 * A store that contains a signer instance or undefined
 */
export const wallet = writable<EthersContractRunner | undefined>();