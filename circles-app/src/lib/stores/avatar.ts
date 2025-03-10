import type { Avatar } from '@circles-sdk/sdk';
import { derived, writable } from 'svelte/store';

/**
 * A store that contains an Avatar instance or undefined.
 */
export const avatar = writable<Avatar | undefined>();

export const isGroup = derived(
  avatar,
  ($avatar) => $avatar?.avatarInfo?.type === 'CrcV2_RegisterGroup'
);
