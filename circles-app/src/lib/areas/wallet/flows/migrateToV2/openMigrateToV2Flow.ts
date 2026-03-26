import { openFlowPopup } from '$lib/shared/state/popup';
import { avatarState } from '$lib/shared/state/avatar.svelte';
import { migrationCanStartAtProfile } from './invitationRequirements';
import { createMigrateToV2Context } from './context';
import { circles as circlesStore } from '$lib/shared/state/circles';
import { requireAvatar, requireCircles } from '$lib/shared/flow';
import { settings } from '$lib/shared/state/settings.svelte';
import { get } from 'svelte/store';
import GetInvitedStep from './1_GetInvited.svelte';
import CreateProfileStep from './2_CreateProfile.svelte';

export async function openMigrateToV2Flow(): Promise<void> {
  const sdk = requireCircles(get(circlesStore));
  const avatar = requireAvatar(avatarState.avatar);
  const avatarInfo = avatar.avatarInfo;
  const canSelfMigrate = avatarInfo
    ? settings.ring
      ? true
      : await sdk.canSelfMigrate(avatarInfo)
    : false;

  const skipInvitationStep = migrationCanStartAtProfile(avatarInfo, canSelfMigrate);

  const component = skipInvitationStep ? CreateProfileStep : GetInvitedStep;

  openFlowPopup({
    title: 'Migrate to v2',
    component,
    props: {
      context: createMigrateToV2Context(),
    },
  });
}
