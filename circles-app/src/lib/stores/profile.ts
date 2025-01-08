import { get, writable } from 'svelte/store';
import type { Avatar } from '@circles-sdk/sdk';
import type { Profile } from '@circles-sdk/profiles';
import { circles } from '$lib/stores/circles';

export const profile = writable<Profile | undefined>(undefined);

export async function loadProfile(avatar: Avatar | undefined) {
    if (!avatar) {
        profile.set(undefined);
        return;
    }
    try {
        const sdk = get(circles);
        const fetchedProfile = await sdk?.profiles?.get(avatar.avatarInfo?.cidV0 ?? '');
        profile.set(fetchedProfile);
    } catch (error) {
        console.error('Failed to load profile:', error);
        profile.set(undefined);
    }
}
