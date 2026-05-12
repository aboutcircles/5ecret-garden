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
  requireCircles(get(circlesStore)); // ensure SDK is available
  const avatar = requireAvatar(avatarState.avatar);
  const avatarInfo = avatar.avatarInfo;
  // New SDK has no canSelfMigrate(); check inline if avatar has active v1 token
  const info = avatarInfo as any;
  const canSelfMigrate = avatarInfo
    ? settings.ring
      ? true
      : (info?.version === 1 || (info?.hasV1 === true && info?.v1Stopped !== true))
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
