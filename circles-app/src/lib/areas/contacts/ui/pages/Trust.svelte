<script lang="ts">
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { runTask } from '$lib/shared/utils/tasks';
    import { shortenAddress } from '$lib/shared/utils/shared';
    import TrustActionCard from '$lib/areas/contacts/ui/components/TrustActionCard.svelte';
    import { popupControls } from '$lib/shared/state/popup';

    interface Props { address: `0x${string}`; }
    let { address }: Props = $props();

    async function trust() {
        if (!avatarState.avatar) {
            throw new Error('Avatar store not available');
        }
        runTask({
            name: `Trusting ${shortenAddress(address)} ...`,
            promise: avatarState.avatar!.trust(address),
        });
        popupControls.close();
    }
</script>

<TrustActionCard
  {address}
  intro="You're about to trust the following group or person:"
  warning="Trust means you accept Circles from this account. When payments route through the network, you may end up holding more of their Circles and fewer of yours (your total stays the same)."
  quickHelpTitle="What trusting changes"
  quickHelpLines={[
    'Trust means you accept this account’s Circles.',
    'Routing can change whose Circles you hold (total stays the same).',
    'You can untrust later to stop accepting more.',
  ]}
  showExplainerDetails={false}
  cta="Trust"
  action={trust}
 />
