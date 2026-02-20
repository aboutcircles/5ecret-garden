<script lang="ts">
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { runTask } from '$lib/shared/utils/tasks';
    import { shortenAddress } from '$lib/shared/utils/shared';
    import TrustActionCard from '$lib/areas/contacts/ui/components/TrustActionCard.svelte';
    import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
    import { UNTRUST_EXPLAINER_POINTS, UNTRUST_QUICK_HELP_LINES } from '$lib/shared/content/trustRoutingCopy';
    import { refreshContactStore } from '$lib/shared/state/contacts/contacts';

    interface Props { address: `0x${string}`; trustVersion?: number; }
    let { address }: Props = $props();

    async function untrust() {
        if (!avatarState.avatar) {
            throw new Error('Avatar store not available');
        }
        // New SDK handles V1+V2 untrust uniformly via trust.remove()
        await runTask({
            name: `Untrusting ${shortenAddress(address)} ...`,
            promise: avatarState.avatar!.trust.remove(address),
        });

        // Wait for blockchain state to update, then refresh contacts
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (avatarState.avatar) {
            refreshContactStore(avatarState.avatar);
        }

        popupControls.close();
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
