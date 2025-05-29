<script lang="ts">
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';
  import {
  clearSession,
    initBrowserProviderContractRunner,
    signer,
    wallet,
  } from '$lib/stores/wallet.svelte';
  import { getCirclesConfig } from '$lib/utils/helpers.js';
  import { Sdk } from '@circles-sdk/sdk';
  import type { Address } from '@circles-sdk/utils';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import { circles } from '$lib/stores/circles';
  import type { AvatarRow, GroupRow } from '@circles-sdk/data';
  import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/utils/getGroupsByOwnerBatch';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';
  import SettingsDropdown from '$lib/components/SettingsDropdown.svelte';
  import { settings } from '$lib/stores/settings.svelte';

  let groupsByOwner: Record<Address, GroupRow[]> | undefined = $state();
  let avatarInfo: AvatarRow | undefined = $state();

  $effect(() => {
    (async () => {
      const circlesConfig = await getCirclesConfig(BigInt(100), settings.ring);
      if (!$wallet) {
        $wallet = await initBrowserProviderContractRunner();
      }
      $circles = new Sdk($wallet, circlesConfig);

      if (!signer.address || !$circles) {
        clearSession();
        return;
      }

      groupsByOwner = await getBaseAndCmgGroupsByOwnerBatch($circles, [
        signer.address,
      ]);
      avatarInfo = await $circles.data.getAvatarInfo(signer.address);
    })();
  });
</script>

<div
  class="w-full flex flex-col items-center min-h-screen max-w-xl gap-y-4 mt-20"
>
  <div class="w-full">
    <button onclick={() => history.back()}>
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </button>
  </div>
  <h2 class="font-bold text-[28px] md:text-[32px]">Select Account</h2>
  <p class="font-normal text-black/60 text-base">
    Please select the account you want to use from the list below.
  </p>
  <div class="flex w-full justify-end">
    <SettingsDropdown />
  </div>
  {#if !$circles || !signer.address}
    <WalletLoader />
  {:else if settings.legacy}
    <ConnectCircles
      address={signer.address}
      walletType="injected"
      isRegistered={avatarInfo !== undefined}
      groups={groupsByOwner?.[signer.address] ?? []}
      chainId={100n}
    />
  {:else}
    <ConnectSafe
      safeOwnerAddress={signer.address}
      chainId={100n}
      walletType="safe"
      sdk={$circles}
    />
  {/if}
</div>
