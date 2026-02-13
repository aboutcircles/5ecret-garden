<script lang="ts">
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { runTask } from '$lib/shared/utils/tasks';
  import { shortenAddress } from '$lib/shared/utils/shared';
  import { popupControls } from '$lib/shared/state/popup';

  interface Props {
    address: `0x${string}`;
  }

  let { address }: Props = $props();

  async function invite() {
    if (!avatarState.avatar) {
      throw new Error('Avatar store not available');
    }
    runTask({
      name: `Inviting ${shortenAddress(address)} ...`,
      promise: avatarState.avatar!.inviteHuman(address),
    });
    popupControls.close();
  }
</script>

<div class="p-6 pt-0 mt-6">
  <p class="mb-4">You're about to invite the following address to Circles:</p>

  <div
    class="inline-flex items-center space-x-2 border-2 p-6 rounded-2xl w-full"
  >
    <div>
      <span>{shortenAddress(address)}</span>
      <p class="text-xs text-base-content/70">
        <a
          href="https://gnosisscan.io/address/{address}"
          target="_blank"
          rel="noopener noreferrer"
          class="link link-primary">View on Gnosisscan</a
        >
      </p>
    </div>
  </div>

  <p class="mb-4 mt-4">
    The person will appear in your contacts once they accept the invitation.
  </p>

  <div class="modal-action">
    <button
      type="submit"
      class="btn btn-primary btn-sm"
      onclick={async () => await invite()}>Invite</button
    >
  </div>
</div>
