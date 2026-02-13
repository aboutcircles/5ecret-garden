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
  warning="Un-trusting means that you no longer accept their tokens."
  explainerTitle="How this untrust action works"
  explainerPoints={[
    'Trust is binary: removing trust fully turns this relation off.',
    'Trust is one-way. Removing your trust does not automatically remove their trust in you.',
    'Removing trust can reduce available transfer paths and may lower what is sendable through your network.',
  ]}
  cta="Untrust"
  action={untrust}
/>
