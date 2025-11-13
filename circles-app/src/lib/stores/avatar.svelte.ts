import type { GroupType } from '@aboutcircles/sdk-types';
import type { Profile } from '@aboutcircles/sdk-types';
import type {
  HumanAvatar,
  BaseGroupAvatar,
  OrganisationAvatar,
} from '@aboutcircles/sdk';

export let avatarState: {
  avatar: HumanAvatar | BaseGroupAvatar | OrganisationAvatar | undefined;
  isGroup: boolean | undefined;
  isHuman: boolean | undefined;
  groupType: GroupType | undefined;
  profile: Profile | undefined;
} = $state({
  avatar: undefined,
  isGroup: undefined,
  isHuman: undefined,
  groupType: undefined,
  profile: undefined,
});
