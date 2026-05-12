<script lang="ts">
  import { goto } from '$app/navigation';
  import AddressDisplay from '$lib/shared/ui/primitives/Address.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import QrCode from '$lib/shared/ui/primitives/QrCode.svelte';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';
  import { signer } from '$lib/shared/state/wallet.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { circles } from '$lib/shared/state/circles';
  import type { Address } from '@aboutcircles/sdk-types';

  interface Props {
    address: Address | undefined;
  }

  let { address = undefined }: Props = $props();

  function changeWallet() {
    popupControls.close();

    signer.privateKey
      ? goto('/connect-wallet/import-circles-garden')
      : goto('/connect-wallet/connect-safe');
  }

  function disconnectProfile() {
    popupControls.close();

    // Clear avatar + SDK so connect-safe page creates a fresh instance
    avatarState.avatar = undefined;
    avatarState.isGroup = undefined;
    avatarState.isHuman = undefined;
    avatarState.groupType = undefined;
    avatarState.profile = undefined;
    circles.set(undefined);

    signer.privateKey
      ? goto('/connect-wallet/import-circles-garden')
      : goto('/connect-wallet/connect-safe');
  }
</script>

<div
  class="flex flex-col items-center w-full sm:w-[90%] lg:w-3/5 mx-auto gap-y-4 mt-10"
>
  <Avatar view="vertical" clickable={false} {address} />
  <div class="flex gap-x-2">
    {#if address}
      <AddressDisplay {address} />
    {/if}
    <button
      onclick={changeWallet}
      class="btn btn-sm btn-outline btn-primary text-primary hover:text-white"
      >Change Avatar
    </button>
  </div>

  <div class="shadow-lg rounded-lg">
    <QrCode value={address} />
  </div>

  <button
    onclick={disconnectProfile}
    class="btn btn-sm btn-ghost text-error mt-4"
  >Disconnect this profile
  </button>
</div>
