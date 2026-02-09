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
  warning="Trusting someone means that you accept their tokens at the same value as your own."
  cta="Trust"
  action={trust}
/>
