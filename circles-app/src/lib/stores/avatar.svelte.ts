import type { GroupType } from '@circles-sdk/data';
import type { Profile } from '@circles-sdk/profiles';
import type { HumanAvatar, BaseGroupAvatar, OrganisationAvatar } from '@circles-sdk-v2/sdk';

export let avatarState: {
    avatar: HumanAvatar | BaseGroupAvatar | OrganisationAvatar | undefined,
    isGroup: boolean | undefined,
    isHuman: boolean | undefined,
    groupType: GroupType | undefined,
    profile: Profile | undefined
} = $state({ avatar: undefined, isGroup: undefined, isHuman: undefined, groupType: undefined, profile: undefined });