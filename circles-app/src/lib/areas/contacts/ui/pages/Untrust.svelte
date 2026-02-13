<script lang="ts">
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { runTask } from '$lib/shared/utils/tasks';
    import { shortenAddress } from '$lib/shared/utils/shared';
    import { V1Avatar } from '@circles-sdk/sdk';
    import { circles } from '$lib/shared/state/circles';
    import TrustActionCard from '$lib/areas/contacts/ui/components/TrustActionCard.svelte';
    import { popupControls } from '$lib/shared/state/popup';

    interface Props { address: `0x${string}`; trustVersion: number; }
    let { address, trustVersion }: Props = $props();

    async function untrust() {
        if (!avatarState.avatar) {
            throw new Error('Avatar store not available');
        }
        if (trustVersion == 1) {
            const v1Avatar = new V1Avatar($circles!, avatarState.avatar.avatarInfo!);
            runTask({
                name: `Untrusting V1 ${shortenAddress(address)} ...`,
                promise: v1Avatar.untrust(address),
            });
        } else {
            runTask({
                name: `Untrusting V2 ${shortenAddress(address)} ...`,
                promise: avatarState.avatar!.untrust(address),
            });
        }
        popupControls.close();
    }
</script>

<TrustActionCard
  {address}
  intro="You're about to un-trust the following group or person:"
  warning="Untrust stops accepting their Circles from now on. It doesn’t delete anything you already hold."
  quickHelpTitle="What untrusting changes"
  quickHelpLines={[
    'Untrust stops accepting their Circles from now on.',
    'It doesn’t remove balances you already hold.',
    'Some routes may stop working until other paths exist.',
  ]}
  showExplainerDetails={false}
  explainerPoints={[
    'Untrust is on/off: it removes the trust link.',
    'Trust is one-way: untrusting doesn’t remove their trust in you.',
    'Some routes that worked before may stop working.',
    'You can trust again later.',
  ]}
  cta="Untrust"
  action={untrust}
/>
