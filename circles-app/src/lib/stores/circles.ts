import { writable } from 'svelte/store';
import type { Sdk } from '@circles-sdk-v2/sdk';

/**
 * A store that contains the fully configured Circles SDK instance or undefined
 * Can be either the old @circles-sdk or new @markfender SDK during migration
 */
export const circles = writable<Sdk | undefined>();
