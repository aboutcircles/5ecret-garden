<script lang="ts">
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { runTask } from '$lib/utils/tasks';
  import { shortenAddress } from '$lib/utils/shared';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { popupControls } from '$lib/stores/popUp.svelte';
  import RowFrame from '$lib/ui/RowFrame.svelte';
  import { initContactStore } from '$lib/stores/contacts';

  interface Props {
    address: `0x${string}`;
  }
  let { address }: Props = $props();

  async function untrust() {
    if (!avatarState.avatar) {
      throw new Error('Avatar store not available');
    }

    await runTask({
      name: `Untrusting ${shortenAddress(address)} ...`,
      promise: avatarState.avatar!.trust.remove(address),
    });

    // Wait for blockchain state to update
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Refresh the contacts list
    if (avatarState.avatar) {
      console.log('Refreshing contacts list after untrust...');
      initContactStore(avatarState.avatar);
    }

    popupControls.close();
  }
</script>

<div class="flex flex-col gap-y-4 mt-8">
  <p class="mb-4">You're about to un-trust the following group or person:</p>

  <RowFrame clickable={false} dense={true} noLeading={true}>
    <div class="min-w-0">
      <Avatar
        {address}
        clickable={false}
        view="horizontal"
        bottomInfo={address}
      />
    </div>
  </RowFrame>

  <div role="alert" class="alert alert-warning">
    <span>Un-trusting means that you no longer accept their tokens.</span>
  </div>

  <div>
    <ActionButton action={untrust}>Untrust</ActionButton>
  </div>
</div>
