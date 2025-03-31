<script lang="ts">
  import { goto } from '$app/navigation';
  import Address from '$lib/components/Address.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import QrCode from '$lib/components/QrCode.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import type { WalletType } from '$lib/utils/walletType';

  interface Props {
    address: Address | undefined;
  }

  let { address = undefined }: Props = $props();

  function changeWallet() {
    popupControls.close();
    const walletType: WalletType | null = localStorage.getItem('walletType') as WalletType | null;
    switch (walletType) {
      case 'metamask':
        goto('/connect-wallet/connect-metamask');
        break;
      case 'safe':
        goto('/connect-wallet/connect-safe');
        break;
      case 'circles':
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
