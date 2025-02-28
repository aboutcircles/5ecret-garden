import { derived, writable } from 'svelte/store';
import { Avatar } from '@circles-sdk/sdk';

/**
 * A store that contains an Avatar instance or undefined.
 */
export const avatar = writable<Avatar | undefined>();

export const isGroup = derived(
  avatar,
  ($avatar) => $avatar?.avatarInfo?.type === 'CrcV2_RegisterGroup'
);
