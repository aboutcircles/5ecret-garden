import type {AvatarRow} from "@circles-sdk/data";
import {get} from "svelte/store";
import {circles} from "$lib/stores/circles";

export function canMigrate(avatar: AvatarRow | undefined): boolean {
    if (!avatar) {
        return false;
    }

    if (!get(circles)?.v2Hub) {
        return false;
    }

    // Pure v1 avatars can migrate
    if (avatar.version === 1) {
        return true;
    }

    // v2 avatars can migrate if they have a v1 token and it's not stopped
    if (avatar.hasV1 && avatar.version === 2) {
        return (avatar.v1Token !== null && !avatar.v1Stopped) ?? false;
    }

    return false;
}