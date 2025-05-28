<script lang="ts">
  import {  initializeContractRunner, wallet } from '$lib/stores/wallet.svelte';
  import { circles } from '$lib/stores/circles';
  import { Sdk, type AvatarRow } from '@circles-sdk/sdk';
  import { onMount } from 'svelte';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import { getCirclesConfig } from '$lib/utils/helpers';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';
  import type { Network } from 'ethers';
  import type { SdkContractRunnerWrapper } from '@circles-sdk/adapter-ethers';
  import type { Address } from '@circles-sdk/utils';
  import { CirclesStorage } from '$lib/utils/storage';
  import { environment } from '$lib/stores/environment.svelte';
  import type { GroupRow } from '@circles-sdk/data';
  import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/utils/getGroupsByOwnerBatch';

  const GNOSIS_CHAIN_ID_DEC = 100n;

  let avatarInfo: AvatarRow | undefined = $state();
  let network: Network | undefined = $state();
  let groupsByOwner: Record<Address, GroupRow[]> | undefined = $state();

  //
  // Connects the wallet and initializes the Circles SDK.
  //
  async function setup(callNo: number = 0) {
    const walletType = CirclesStorage.getInstance().walletType;
    if (walletType != "metamask") {
      CirclesStorage.getInstance().data = {
        avatar: undefined,
        group: undefined
      };
    }

    $wallet = await initializeContractRunner('metamask');

    if (!$wallet.address) {
      throw new Error('Failed to get wallet address');
    }

    network = await ($wallet as any).provider?.getNetwork();
    if (!network) {
      throw new Error('Failed to get network');
    }

    if (callNo > 2) {
      return;
    }

    const circlesConfig = await getCirclesConfig(network.chainId, environment.ring);

    // Initialize the Circles SDK and set it as $circles to make it globally available.
    $circles = new Sdk($wallet! as SdkContractRunnerWrapper, circlesConfig);
    groupsByOwner = await getBaseAndCmgGroupsByOwnerBatch($circles, [
       $wallet.address.toLowerCase() as Address,
     ]);;
     console.log(groupsByOwner);
    avatarInfo = await $circles.data.getAvatarInfo($wallet.address);

    CirclesStorage.getInstance().data = {
      walletType: 'metamask'
    };
  }

  onMount(async () => {
    $wallet = undefined;
    await setup();
  });
</script>

<div
  class="w-full flex flex-col items-center min-h-screen max-w-xl gap-y-4 mt-20"
>
  <div class="w-full">
    <button onclick="{() => history.back()}">
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </button>
  </div>
  <h2 class="font-bold text-[28px] md:text-[32px]">Select Account</h2>
  <p class="font-normal text-black/60 text-base">
    Please select the account you want to use from the list below.
  </p>
  {#if $wallet?.address && $circles && network && groupsByOwner}
    <ConnectCircles
      address={$wallet.address}
      walletType="metamask"
      isRegistered={avatarInfo !== undefined}
      groups={groupsByOwner[$wallet.address.toLowerCase() as Address]}
      chainId={network.chainId}
    />
  {:else}
    <WalletLoader name="Metamask" />
  {/if}
</div>
