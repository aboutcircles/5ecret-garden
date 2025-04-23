import type { GroupType } from '@circles-sdk/data';
import type { Profile } from '@circles-sdk/profiles';
import type { Avatar } from '@circles-sdk/sdk';

export let avatarState: { avatar: Avatar | undefined, isGroup: boolean | undefined, groupType: GroupType | undefined, profile: Profile | undefined } = $state({ avatar: undefined, isGroup: undefined, groupType: undefined, profile: undefined });