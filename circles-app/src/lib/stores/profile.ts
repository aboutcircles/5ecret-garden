import { derived, type Readable } from 'svelte/store';
import { avatar } from '$lib/stores/avatar';
import { getProfile } from '$lib/utils/profile';
import type { Profile } from '@circles-sdk/profiles';

export const profile: Readable<Profile | undefined> = derived(avatar, ($avatar, set) => {
  if ($avatar) {
    getProfile($avatar?.avatarInfo?.avatar ?? '0x0').then(set);
  }
});
