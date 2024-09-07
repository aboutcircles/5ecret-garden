import type {AvatarRow} from "@circles-sdk/data";

export function canInvite(avatar: AvatarRow | undefined): boolean {
    // Invitations only work for human v2 avatars.
    // If they have a v1 token, it must be stopped.
    if (!avatar) {
        return false;
    }

    return avatar.version === 2 && avatar.isHuman;
}