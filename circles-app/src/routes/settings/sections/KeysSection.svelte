<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import ProfileSigningKeys from '$lib/profile/ProfileSigningKeys.svelte';

  type Props = {
    avatarAddress: Address | '';
    pinApiBase: string;
    deleteLocalKey: () => Promise<void>;
  };

  let { avatarAddress, pinApiBase, deleteLocalKey }: Props = $props();
</script>

{#if !avatarAddress}
  <div class="p-4 text-sm opacity-70">Connect a Circles avatar first to manage keys.</div>
{:else}
  <ProfileSigningKeys avatar={avatarAddress} {pinApiBase} readonly={false} />

  <div class="w-full pt-4">
    <h2 class="font-bold">Security</h2>
    <div class="mt-2 text-xs text-base-content/70">Manage keys stored on this device.</div>
    <div class="mt-3">
      <button
        class="btn btn-outline btn-sm"
        onclick={deleteLocalKey}
        title="Remove the Circles.garden key from this device"
      >
        Delete key from this device
      </button>
    </div>
  </div>
{/if}
