<script lang="ts">
  import { goto } from '$app/navigation';
  import Address from '$lib/components/Addres.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import QrCode from '$lib/components/QrCode.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import { signer } from '$lib/stores/wallet.svelte';
  import type { Address as AddressType } from '@circles-sdk/utils';

  interface Props {
    address: AddressType;
  }

  let { address }: Props = $props();

  function changeWallet() {
    popupControls.close();

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
    <Address {address} />
    <button
      onclick={changeWallet}
      class="btn btn-sm btn-outline btn-primary text-primary hover:text-white"
      >Change Avatar
    </button>
  </div>

  <div class="shadow-lg rounded-lg">
    <QrCode value={address} />
  </div>
</div>
