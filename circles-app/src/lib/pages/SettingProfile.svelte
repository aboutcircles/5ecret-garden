<script lang="ts">
  import { goto } from '$app/navigation';
  import Address from '$lib/components/Address.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import QrCode from '$lib/components/QrCode.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import { clearSession, wallet } from '$lib/stores/wallet';
  import { SafeSdkBrowserContractRunner } from '@circles-sdk/adapter-safe';

  export let address: string = '';

  function changeWallet() {
    popupControls.close();
    if ($wallet instanceof SafeSdkBrowserContractRunner) {
      goto('/connect-wallet/connect-safe');
    } else {
      goto('/connect-wallet/connect-metamask');
    }
  }
</script>

<div
  class="flex flex-col items-center w-full sm:w-[90%] lg:w-3/5 mx-auto gap-y-4 mt-10"
>
  <Avatar view="vertical" clickable={false} {address} />
  <div class="flex gap-x-2">
    <Address {address} />
    <button
      on:click={changeWallet}
      class="btn btn-sm btn-outline btn-primary text-primary hover:text-white"
      >Change Avatar</button
    >
  </div>

  <div class="shadow-lg rounded-lg">
    <QrCode value={address} />
  </div>
</div>
