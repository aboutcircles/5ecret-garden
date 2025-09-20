<script lang="ts">
    import { avatarState } from '$lib/stores/avatar.svelte';
    import { runTask } from '$lib/utils/tasks';
    import { shortenAddress } from '$lib/utils/shared';
    import ActionButton from '$lib/components/ActionButton.svelte';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import { popupControls } from '$lib/stores/popUp';
    import RowFrame from '$lib/ui/RowFrame.svelte';

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

<div class="flex flex-col gap-y-4 mt-8">
    <p>You're about to trust the following group or person:</p>

    <RowFrame clickable={false} dense={true} noLeading={true}>
        <div class="min-w-0">
            <Avatar {address} clickable={false} view="horizontal" bottomInfo={address} />
        </div>
    </RowFrame>

    <div role="alert" class="alert alert-warning">
        <span>Trusting someone means that you accept their tokens at the same value as your own.</span>
    </div>

    <div>
        <ActionButton action={trust}>Trust</ActionButton>
    </div>
</div>
