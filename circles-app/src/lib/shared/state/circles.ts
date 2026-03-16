import { writable } from 'svelte/store';
import type { Sdk } from '@aboutcircles/sdk';

/**
 * A store that contains the fully configured Circles SDK instance (@aboutcircles/sdk) or undefined.
 */
export const circles = writable<Sdk | undefined>();
