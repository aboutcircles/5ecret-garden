<script lang="ts">
  import { initializeWallet, wallet } from '$lib/stores/wallet';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import { Sdk, type CirclesConfig } from '@circles-sdk/sdk';
  import { goto } from '$app/navigation';
  import { getCirclesConfig } from '$lib/utils/helpers';
  import Avatar from './avatar/Avatar.svelte';
  import type { WalletType } from '$lib/utils/walletType';
  import type { Address } from '@circles-sdk/utils';
  import type { SdkContractRunner } from '@circles-sdk/adapter';
  import type { CoreMembersGroupRow } from '@circles-sdk/data/dist/rows/coreMembersGroupRow';

  interface Props {
    address: Address;
    isRegistered: boolean;
    walletType: WalletType;
    chainId: bigint;
    groups?: CoreMembersGroupRow[]
    isV1?: boolean;
  }

  let { address, isRegistered, walletType, chainId, groups, isV1 }: Props = $props();

  let circlesConfig: CirclesConfig;

  async function connectWallet(selectedAddress: Address) {
    const lowerCaseAddress = selectedAddress.toLowerCase() as Address;

    $wallet = await initializeWallet(walletType, address);
    circlesConfig = await getCirclesConfig(chainId);
    $circles = new Sdk($wallet! as SdkContractRunner, circlesConfig);

    if (lowerCaseAddress === address.toLowerCase() && !isRegistered) {
      await goto('/register');
      return;
    }

    if ($circles && $wallet) {
      $avatar = await $circles.getAvatar(lowerCaseAddress);
      localStorage.setItem('avatar', lowerCaseAddress);
      await goto('/dashboard');
    }
  }

  async function deployGroup() {
    if ($circles && $wallet) {
      $wallet = await initializeWallet(walletType, address);
      circlesConfig = await getCirclesConfig(chainId);
      $circles = new Sdk($wallet! as SdkContractRunner, circlesConfig);

      await goto('/register/register-group');
    }
  }
</script>

<div class="w-full border rounded-lg flex flex-col p-4 shadow-sm">
  <button
    onclick={() => connectWallet(address)}
    class="flex justify-between items-center hover:bg-black/5 rounded-lg p-2"
  >
    <Avatar
      topInfo={walletType === 'safe' ? 'Safe' : 'Connected Wallet'}
      {address}
      clickable={false}
      view="horizontal"
    />
    {#if !isRegistered}
      <div class="btn btn-xs btn-outline btn-primary">register</div>
    {:else}
      {#if isV1}
        <div class="btn btn-xs btn-outline btn-primary">V1</div>
      {:else}
        <div class="btn btn-xs btn-outline btn-primary">V2</div>
      {/if}
    {/if}
  </button>
  <!--{#if walletType !== 'circles'}-->
  <div class="w-full flex gap-x-2 items-center mt-6">
    <p class="font-bold text-primary">My groups</p>
    <button
      onclick={() => deployGroup()}
      class="btn btn-xs btn-ghost btn-circle"
    ><img src="/plus.svg" alt="Plus" class="w-5" /></button
    >
  </div>
  <div class="w-full pl-6 flex flex-col gap-y-2 mt-2">
    {#each (groups ?? []) as group}
      <button
        class="flex w-full hover:bg-black/5 rounded-lg p-2"
        onclick={() => connectWallet(group.proxy)}
      >
        <Avatar
          address={group.proxy}
          clickable={false}
          view="horizontal"
          topInfo={group.proxy}
        />
      </button
      >
    {/each}
    {#if (groups ?? []).length === 0}
      <p class="text-sm">No groups available.</p>
    {/if}
  </div>
  <!--{/if}-->
</div>
