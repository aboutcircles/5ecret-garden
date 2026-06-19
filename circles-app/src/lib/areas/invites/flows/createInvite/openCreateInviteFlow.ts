import { openStep } from '$lib/shared/flow';
import CreateInviteLink from './CreateInviteLink.svelte';

/** Open the "create invite link" flow as a fresh popup. */
export function openCreateInviteFlow(): void {
  openStep({
    title: 'Invite to Circles',
    component: CreateInviteLink,
    props: {},
    key: 'create-invite-link',
  });
}
