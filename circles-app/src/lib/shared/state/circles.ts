import { writable } from 'svelte/store';
import type { Sdk } from '@circles-sdk/sdk';

/**
 * A store that contains the fully configured Circles SDK instance or undefined
 */
export const circles = writable<Sdk | undefined>();
