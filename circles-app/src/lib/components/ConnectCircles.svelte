<script lang="ts">
  import {
    wallet,
  } from '$lib/stores/wallet.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import { Sdk } from '@circles-sdk/sdk';
  import { goto } from '$app/navigation';
  import Avatar from './avatar/Avatar.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { CirclesStorage } from '$lib/utils/storage';
  import type { GroupRow } from '@circles-sdk/data';
  import { settings } from '$lib/stores/settings.svelte';

  interface Props {
    address: Address;
    isRegistered: boolean;
    groups?: GroupRow[];
    isV1?: boolean;
    initSdk: (address: Address) => Promise<Sdk>;
  }

  let { address, isRegistered, groups, isV1, initSdk }: Props = $props();

  async function connectAvatar(ownerAddress: Address, groupAddress?: Address) {
    const sdk = await initSdk(ownerAddress);
    $circles = sdk;

    if (ownerAddress === address && !isRegistered) {
      await goto('/register');
      return;
    }
    avatarState.avatar = await sdk.getAvatar(groupAddress ?? ownerAddress);
    avatarState.isGroup = groupAddress ? true : false;
    avatarState.groupType = groupAddress
      ? await sdk.getGroupType(groupAddress)
      : undefined;
    CirclesStorage.getInstance().data = {
      avatar: ownerAddress,
      group: groupAddress,
      isGroup: avatarState.isGroup,
      groupType: avatarState.groupType,
      rings: settings.ring,
      legacy: settings.legacy,
    };


    await goto('/dashboard');
  }

  async function deployGroup() {
    if ($circles && $wallet) {
      // $wallet = await initializeContractRunner(walletType, address);
      // $circles = new Sdk($wallet! as SdkContractRunner, circlesConfig);

      await goto('/register/register-group/' + address);
    }
  }
</script>

<div class="w-full border rounded-lg flex flex-col p-4 shadow-sm">
  <button
    onclick={() => connectAvatar(address)}
    class="flex justify-between items-center hover:bg-black/5 rounded-lg p-2"
  >
    <Avatar
      topInfo={settings.legacy ? 'Connected Wallet' : 'Safe'}
      {address}
      clickable={false}
      view="horizontal"
    />
    <div class="btn btn-xs btn-outline btn-primary">
      {#if !isRegistered}
        register
      {:else if isV1}
        V1
      {:else}
        V2
      {/if}
    </div></button
  >
  <div class="w-full flex gap-x-2 items-center justify-between mt-6 px-2">
    <p class="font-bold text-primary">My groups</p>
    <button
      onclick={() => deployGroup()}
      class="btn btn-xs btn-outline btn-primary">Create a group</button
    >
  </div>
  <div class="w-full pl-6 flex flex-col gap-y-2 mt-2">
    {#each groups ?? [] as group}
      <button
        class="flex w-full hover:bg-black/5 rounded-lg p-2"
        onclick={() => connectAvatar(address, group.group as Address)}
      >
        <Avatar
          address={group.group as Address}
          clickable={false}
          view="horizontal"
          topInfo={group.group as Address}
        />
      </button>
    {/each}
    {#if (groups ?? []).length === 0}
      <p class="text-sm">No groups available.</p>
    {/if}
  </div>
</div>
