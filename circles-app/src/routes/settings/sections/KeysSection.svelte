<script lang="ts">
  import type { Address } from '@circles-sdk/utils';
  import ProfileSigningKeys from '$lib/domains/profile/ui/ProfileSigningKeys.svelte';
  import AddSigningKey from '$lib/domains/profile/ui/AddSigningKey.svelte';
  import { popupControls } from '$lib/shared/state/popup';
  import { browser } from '$app/environment';
  import { CirclesStorage } from '$lib/utils/storage';

  type Props = {
    avatarAddress: Address | '';
    pinApiBase: string;
    deleteLocalKey: () => Promise<void>;
  };

  let { avatarAddress, pinApiBase, deleteLocalKey }: Props = $props();

  let hasLocalPrivateKey = $state(false);

  $effect(() => {
    if (!browser) {
      hasLocalPrivateKey = false;
      return;
    }
    const storage = CirclesStorage.getInstance();
    const key = storage.privateKey;
    hasLocalPrivateKey = !!(key && key.trim().length > 0);
  });

  function openAddSigningKey(): void {
    if (!avatarAddress) return;
    popupControls.open({
      title: 'Add signing key',
      component: AddSigningKey,
      props: { avatar: avatarAddress, pinApiBase },
    });
  }
</script>

<section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-sm font-semibold m-0">Signing keys</h3>
      <p class="text-xs text-base-content/70 mt-0.5">Manage keys stored for this avatar.</p>
    </div>
    {#if avatarAddress}
      <button class="btn btn-primary btn-sm" onclick={openAddSigningKey}>Add signing key</button>
    {/if}
  </div>
</section>

{#if !avatarAddress}
  <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
    <div class="text-sm opacity-70">Connect a Circles avatar first to manage keys.</div>
  </section>
{:else}
  <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
    <ProfileSigningKeys
      avatar={avatarAddress}
      {pinApiBase}
      readonly={false}
      showHeader={false}
      onAddSigningKey={openAddSigningKey}
    />
  </section>

  {#if hasLocalPrivateKey}
    <section class="bg-base-100 border border-base-300 rounded-xl p-4 w-full">
      <div>
        <h3 class="text-sm font-semibold m-0">Security</h3>
        <p class="text-xs text-base-content/70 mt-0.5">
          A locally stored (imported v1) private key exists on this device.
        </p>
      </div>
      <div class="mt-3">
        <button
          class="btn btn-outline btn-sm"
          onclick={deleteLocalKey}
          title="Remove the Circles.garden key from this device"
        >
          Delete key from this device
        </button>
      </div>
    </section>
  {/if}
{/if}
