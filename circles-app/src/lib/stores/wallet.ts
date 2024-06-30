import {writable} from "svelte/store";
import type {ContractRunnerWithMetadata} from "@circles-sdk/sdk";

/**
 * A store that contains a signer instance or undefined
 */
export const wallet = writable<ContractRunnerWithMetadata | undefined>();