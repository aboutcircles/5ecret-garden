import type { Profile } from '@circles-sdk/profiles';
import type { Avatar } from '@circles-sdk/sdk';
import { readable } from 'svelte/store';

export let avatarState: { avatar: Avatar | undefined, isGroup: boolean | undefined, profile: Profile | undefined } = $state({ avatar: undefined, isGroup: undefined, profile: undefined });

export const avatarStore = readable(avatarState.avatar, (set) => {
    $effect(() => {
        if (avatarState.avatar) {
            set(avatarState.avatar);
        }
    });
});