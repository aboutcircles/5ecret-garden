<script lang="ts">
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';
  import {
    clearSession,
    getSigner,
    initBrowserProviderContractRunner,
    initSafeSdkBrowserContractRunner,
    signer,
    wallet,
  } from '$lib/stores/wallet.svelte';
  import type { Address } from '@circles-sdk/utils';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import { type AvatarRow, type GroupRow } from '@circles-sdk/data';
  import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/utils/getGroupsByOwnerBatch';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';
  import SettingsDropdown from '$lib/components/SettingsDropdown.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { onMount } from 'svelte';
  import { gnosisConfig } from '$lib/circlesConfig';
  import { Sdk } from '@circles-sdk/sdk';
  import type { SdkContractRunner } from '@circles-sdk/adapter';
  import { circles } from '$lib/stores/circles';
  import { isAddress } from 'viem';
  let groupsByOwner: Record<Address, GroupRow[]> | undefined = $state();
  let avatarInfo: AvatarRow | undefined = $state();
  let runner: SdkContractRunner | undefined = $state();
  let isReadOnlyMode: boolean = $state(false);
  let readOnlyAddress: Address | undefined = $state(undefined);
  let effectiveAddr: Address | undefined = $state(undefined);
  onMount(async () => {
    signer.address = await getSigner();
    if (!signer.address) {
      await clearSession();
      return;
    }
    runner = await initBrowserProviderContractRunner();
  });

  async function connectLegacy(address: Address) {
    runner = await initBrowserProviderContractRunner();
    wallet.set(runner);
    return new Sdk(
      runner,
      settings.ring ? gnosisConfig.rings : gnosisConfig.production
    );
  }

  async function connectSafe(address: Address) {
    runner = await initSafeSdkBrowserContractRunner(address);
    wallet.set(runner);
    return new Sdk(
      runner,
      settings.ring ? gnosisConfig.rings : gnosisConfig.production
    );
  }

  function getEffectiveAddress(): Address | undefined {
    return isReadOnlyMode && readOnlyAddress && isAddress(readOnlyAddress)
      ? readOnlyAddress
      : signer.address;
  }

  $effect(() => {
    circles.set(
      runner
        ? new Sdk(
            runner,
            settings.ring ? gnosisConfig.rings : gnosisConfig.production
          )
        : undefined
    );
  });

  $effect(() => {
    (async () => {
      effectiveAddr = getEffectiveAddress();
      if (!effectiveAddr || !$circles) return;
      groupsByOwner = await getBaseAndCmgGroupsByOwnerBatch($circles, [
        effectiveAddr,
      ]);
      avatarInfo = await $circles.data.getAvatarInfo(effectiveAddr);
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
  <div class="flex w-full justify-between items-center">
    <div class="flex items-center gap-x-3">
      <label class="flex items-center gap-x-2 cursor-pointer">
        <input
          type="checkbox"
          bind:checked={isReadOnlyMode}
          class="checkbox checkbox-primary checkbox-sm"
        />
        <span class="text-sm font-medium">Read-Only mode</span>
      </label>
    </div>
    <SettingsDropdown />
  </div>

  {#if isReadOnlyMode}
    <div class="w-full">
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text font-medium">Read address</span>
        </div>
        <input
          type="text"
          placeholder="0x..."
          bind:value={readOnlyAddress}
          class="input input-bordered w-full {!readOnlyAddress ||
          !isAddress(readOnlyAddress)
            ? 'input-error'
            : ''}"
        />
        {#if readOnlyAddress && !isAddress(readOnlyAddress)}
          <div class="label">
            <span class="label-text-alt text-error">Invalid address</span>
          </div>
        {/if}
      </label>
    </div>
  {/if}
  {#if !effectiveAddr || !$circles}
    <WalletLoader />
  {:else if isReadOnlyMode && (!readOnlyAddress || !isAddress(readOnlyAddress))}
    <div class="w-full text-center p-4">
      <p class="text-gray-500">Please enter a valid address to continue.</p>
    </div>
  {:else}
    {#if settings.legacy}
      <ConnectCircles
        address={effectiveAddr}
        isRegistered={avatarInfo !== undefined}
        groups={groupsByOwner?.[effectiveAddr] ?? []}
        initSdk={connectLegacy}
      />
         {:else}
       <ConnectSafe
         safeOwnerAddress={effectiveAddr}
         initSdk={connectSafe}
         sdk={$circles}
       />
     {/if}
  {/if}
</div>
