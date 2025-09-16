<script lang="ts">
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { runTask } from '$lib/utils/tasks';
  import { shortenAddress } from '$lib/utils/shared';
  import { V1Avatar } from '@circles-sdk/sdk';
  import { circles } from '$lib/stores/circles';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { popupControls } from '$lib/stores/popUp';

  interface Props {
    address: `0x${string}`;
    trustVersion: number;
  }

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

<div class="flex flex-col gap-y-4 mt-8">
  <p class="mb-4">You're about to un-trust the following group or person:</p>
  <Avatar {address} clickable={false} view="horizontal" bottomInfo={address} />
  <div role="alert" class="alert alert-warning">
    <span>Un-trusting means that you no longer accept their tokens.</span>
  </div>

  <div>
    <ActionButton action={untrust}>Untrust</ActionButton>
  </div>
</div>
