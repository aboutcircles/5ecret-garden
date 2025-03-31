import type { Avatar } from '@circles-sdk/sdk';
import { derived, writable } from 'svelte/store';
import { circles } from './circles';

/**
 * A store that contains an Avatar instance or undefined.
 */
export const avatar = writable<Avatar | undefined>();

// TODO: Find another way that doesn't issue an additional request whenever the `avatar` changes.
export const isGroup = derived(
  [avatar, circles],
  ([$avatar, $circles], set) => {
    if ($avatar?.address) {
      $circles?.isCoreMembersGroup($avatar.address).then(isGroup => {
        set(isGroup);
      });
    } else {
      set(false);
    }
  },
  false,
);
