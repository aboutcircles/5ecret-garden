<script lang="ts">
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { executeTxSubmitFirst } from '$lib/shared/utils/txExecution';
    import { shortenAddress } from '$lib/shared/utils/shared';
    import { V1Avatar } from '@circles-sdk/sdk';
    import { circles } from '$lib/shared/state/circles';
    import TrustActionCard from '$lib/areas/contacts/ui/components/TrustActionCard.svelte';
    import { popupControls } from '$lib/shared/state/popup';
    import { UNTRUST_EXPLAINER_POINTS, UNTRUST_QUICK_HELP_LINES } from '$lib/shared/content/trustRoutingCopy';

    interface Props { address: `0x${string}`; trustVersion: number; }
    let { address, trustVersion }: Props = $props();

    async function untrust() {
        if (!avatarState.avatar) {
            throw new Error('Avatar store not available');
        }
        if (trustVersion == 1) {
            const v1Avatar = new V1Avatar($circles!, avatarState.avatar.avatarInfo!);
            void executeTxSubmitFirst({
                name: `Untrusting V1 ${shortenAddress(address)} ...`,
                submit: () => v1Avatar.untrust(address),
                onSubmitted: () => popupControls.close(),
            });
        } else {
            void executeTxSubmitFirst({
                name: `Untrusting V2 ${shortenAddress(address)} ...`,
                submit: () => avatarState.avatar!.untrust(address),
                onSubmitted: () => popupControls.close(),
            });
        }
    }
</script>

<TrustActionCard
  {address}
  intro="You're about to un-trust the following group or person:"
  warning="Untrust stops accepting their Circles from now on. It doesn’t delete anything you already hold."
  quickHelpTitle="What untrusting changes"
  quickHelpLines={UNTRUST_QUICK_HELP_LINES}
  showExplainerDetails={false}
  explainerPoints={UNTRUST_EXPLAINER_POINTS}
  cta="Untrust"
  action={untrust}
/>
