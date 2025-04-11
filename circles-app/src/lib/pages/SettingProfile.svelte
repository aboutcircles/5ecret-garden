<script lang="ts">
  import { goto } from '$app/navigation';
  import Address from '$lib/components/Address.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import QrCode from '$lib/components/QrCode.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import { CirclesStorage } from '$lib/utils/storage';

  interface Props {
    address: Address | undefined;
  }

  let { address = undefined }: Props = $props();

  function changeWallet() {
    popupControls.close();

    const walletType = CirclesStorage.getInstance().walletType;
    switch (walletType) {
      case 'metamask':
      case 'metamask+group':
        goto('/connect-wallet/connect-metamask');
        break;
      case 'safe':
      case 'safe+group':
        goto('/connect-wallet/connect-safe');
        break;
      case 'circles':
      case 'circles+group':
        goto('/connect-wallet/import-circles-garden');
        break;
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
      onclick={changeWallet}
      class="btn btn-sm btn-outline btn-primary text-primary hover:text-white"
    >Change Avatar
    </button
    >
  </div>

  <div class="shadow-lg rounded-lg">
    <QrCode value={address} />
  </div>
</div>
