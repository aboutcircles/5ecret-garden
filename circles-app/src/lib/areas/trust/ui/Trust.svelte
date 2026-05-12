<script lang="ts">
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { runTask } from '$lib/shared/utils/tasks';
  import { shortenAddress } from '$lib/shared/utils/shared';
  import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import { refreshContactStore } from '$lib/shared/state/contacts/contacts';

  interface Props {
    address: `0x${string}`;
  }
  let { address }: Props = $props();

  async function trust() {
    if (!avatarState.avatar) {
      throw new Error('Avatar store not available');
    }
    await runTask({
      name: `Trusting ${shortenAddress(address)} ...`,
      promise: avatarState.avatar!.trust.add(address),
    });

    // Wait for blockchain state to update
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Refresh the contacts list
    if (avatarState.avatar) {
      refreshContactStore(avatarState.avatar);
    }

    popupControls.close();
  }
</script>

<div class="flex flex-col gap-y-4 mt-8">
  <p>You're about to trust the following group or person:</p>

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
    <span
      >Trusting someone means that you accept their tokens at the same value as
      your own.</span
    >
  </div>

  <div>
    <ActionButton action={trust}>Trust</ActionButton>
  </div>
</div>
