import { derived, type Readable } from 'svelte/store';
import { avatarState } from '$lib/stores/avatar.svelte';
import { getProfile } from '$lib/utils/profile';
import type { Profile } from '@circles-sdk/profiles';

export let profile: Profile | undefined = $state();

$effect(() => {
  if (avatarState.avatar) {
    getProfile(avatarState.avatar?.avatarInfo?.avatar ?? '0x0').then((newProfile) => {
      profile = newProfile;
    });
  }
});
