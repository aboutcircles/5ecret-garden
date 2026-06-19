import type { Avatar } from '@aboutcircles/sdk';
import { isHumanAvatar } from '$lib/shared/utils/avatarHelpers';

/**
 * Whether an avatar can create invite links — a registered human (v2) avatar.
 *
 * Mirrors the intent of the `canInvite` guard, but works against the live
 * avatar object we hold reactively in the UI (its `.avatarInfo` is an
 * `AvatarRow`, which lacks `isHuman`, so we use the `isHumanAvatar` type guard
 * instead). Organizations and groups cannot send invitations.
 */
export function canCreateInviteLinks(avatar: Avatar | undefined): boolean {
  return (
    !!avatar &&
    isHumanAvatar(avatar) &&
    (avatar.avatarInfo?.version ?? 0) === 2
  );
}
