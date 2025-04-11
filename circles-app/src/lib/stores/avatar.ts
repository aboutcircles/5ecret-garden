import type { Avatar } from '@circles-sdk/sdk';
import { derived, writable } from 'svelte/store';
import { circles } from './circles';

/**
 * A store that contains an Avatar instance or undefined.
 */
export const avatar = writable<Avatar | undefined>();

export const isGroup = writable<boolean | undefined>();