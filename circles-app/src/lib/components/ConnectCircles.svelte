<script lang="ts">
  import { initializeContractRunner, wallet } from '$lib/stores/wallet.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import { Sdk, type CirclesConfig } from '@circles-sdk/sdk';
  import { goto } from '$app/navigation';
  import { getCirclesConfig } from '$lib/utils/helpers';
  import Avatar from './avatar/Avatar.svelte';
  import type { WalletType } from '$lib/utils/walletType';
  import type { Address } from '@circles-sdk/utils';
  import type { SdkContractRunner } from '@circles-sdk/adapter';
  import { CirclesStorage } from '$lib/utils/storage';
  import { environment } from '$lib/stores/environment.svelte';
  import type { GroupRow } from '@circles-sdk/data';

  interface Props {
    address: Address;
    isRegistered: boolean;
    walletType: WalletType;
    chainId: bigint;
    groups?: GroupRow[];
    isV1?: boolean;
  }

  let { address, isRegistered, walletType, chainId, groups, isV1 }: Props =
    $props();

  let circlesConfig: CirclesConfig;

  async function connectWallet(avatarAddress: Address, groupAddress?: Address) {
    const lowerCaseAvatarAddress = avatarAddress.toLowerCase() as Address;
    const lowerCaseGroupAddress = groupAddress?.toLowerCase() as Address;

    if (walletType !== 'injected') {
      $wallet = await initializeContractRunner(walletType, address);
      circlesConfig = await getCirclesConfig(chainId, environment.ring);
      $circles = new Sdk($wallet! as SdkContractRunner, circlesConfig);
    }

    if (
      lowerCaseAvatarAddress === address.toLowerCase() &&
      !isRegistered &&
      (lowerCaseGroupAddress?.trim() ?? '') == ''
    ) {
      await goto('/register');
      return;
    }

    if ($circles && $wallet) {
      const avatarToLoad = lowerCaseGroupAddress ?? lowerCaseAvatarAddress;
      avatarState.avatar = await $circles.getAvatar(avatarToLoad);

      if (lowerCaseGroupAddress) {
        CirclesStorage.getInstance().data = {
          walletType: (walletType + '+group') as WalletType,
          avatar: lowerCaseAvatarAddress,
          group: lowerCaseGroupAddress,
        };
        avatarState.isGroup = true;
        avatarState.groupType = await $circles.getGroupType(
          lowerCaseGroupAddress
        );
      } else {
        CirclesStorage.getInstance().data = {
          walletType: walletType,
          avatar: lowerCaseAvatarAddress,
        };
        avatarState.isGroup = false;
      }
      await goto('/dashboard');
    }
  }

  async function deployGroup() {
    if ($circles && $wallet) {
      $wallet = await initializeContractRunner(walletType, address);
      circlesConfig = await getCirclesConfig(chainId, environment.ring);
      $circles = new Sdk($wallet! as SdkContractRunner, circlesConfig);

      await goto('/register/register-group/' + address);
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
        onclick={() => connectWallet(address, group.group as Address)}
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
