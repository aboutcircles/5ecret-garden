import { get, writable } from "svelte/store";
import { avatar } from "$lib/stores/avatar";
import { circles } from "$lib/stores/circles";
import type { Avatar } from "@circles-sdk/sdk";
import type { Profile } from "@circles-sdk/profiles";

const createProfileStore = () => {
    const { subscribe, set } = writable<Profile|undefined>(undefined);

    const updateProfile = async ($avatar:Avatar|undefined) => {
        const profile = await get(circles)?.profiles?.get($avatar?.avatarInfo?.cidV0 ?? "");
        set(profile);
    };

    const avatarUnsubscribe = avatar.subscribe($avatar => {
        updateProfile($avatar)
            .catch(console.warn);
    });

    return {
        subscribe,
        avatarUnsubscribe
    };
};

export const profile = createProfileStore();
