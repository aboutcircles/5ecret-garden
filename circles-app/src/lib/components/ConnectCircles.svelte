<script lang="ts">
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import { Sdk } from '@aboutcircles/sdk';
  import { goto } from '$app/navigation';
  import Avatar from './avatar/Avatar.svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import { CirclesStorage } from '$lib/utils/storage';
  import type { GroupRow } from '@aboutcircles/sdk-types';
  import { GroupType } from '@aboutcircles/sdk-types';
  import { settings } from '$lib/stores/settings.svelte';
  import { popupControls } from '$lib/stores/popUp.svelte';
  import CreateGroup from '$lib/flows/createGroup/1_CreateGroup.svelte';
  import { resetCreateGroupContext } from '$lib/flows/createGroup/context';
  import { initNewSafeBrowserRunner } from '$lib/stores/wallet.svelte';
  import { circlesConfig } from '@aboutcircles/sdk-core';

  interface Props {
    address: Address;
    isRegistered: boolean;
    groups?: GroupRow[];
    sdk: Sdk;
    initSdk: (safeAddress: Address, targetAddress?: Address) => Promise<Sdk>;
    refreshGroupsCallback?: () => void;
  }

  let {
    address,
    isRegistered,
    initSdk,
    groups,
    sdk,
    refreshGroupsCallback,
  }: Props = $props();

  async function connectAvatar(avatarAddress?: Address) {
    //@todo pass runner here
    // Use the safe address if no specific avatar address is provided
    const targetAddress = avatarAddress ?? address;

    // Always create SDK with the Safe address, not the group address
    const sdk = await initSdk(address, targetAddress);
    $circles = sdk;

    // If clicking on the main safe (not a group) and it's not registered, go to registration
    if (targetAddress === address && !isRegistered) {
      await goto('/register');
      return;
    }

    // Use the new SDK to get the avatar for the target (could be Safe or Group)
    // Enable auto event subscription for reactive balance/transaction updates
    avatarState.avatar = await sdk.getAvatar(targetAddress, true);

    // Detect avatar type from the avatarInfo returned by SDK
    const avatarType = (avatarState.avatar.avatarInfo as any)?.type;

    if (avatarType === 'CrcV2_RegisterGroup') {
      avatarState.isGroup = true;
      avatarState.isHuman = false;
      // Try to detect group type - default to base group
      avatarState.groupType = GroupType.Standard;
    } else if (avatarType === 'CrcV2_RegisterOrganization') {
      avatarState.isGroup = false;
      avatarState.isHuman = false;
      avatarState.groupType = undefined;
    } else {
      // Default to human
      avatarState.isGroup = false;
      avatarState.isHuman = true;
      avatarState.groupType = undefined;
    }

    CirclesStorage.getInstance().data = {
      avatar: address,
      group: avatarState.isGroup ? avatarAddress : undefined,
      isGroup: avatarState.isGroup,
      groupType: avatarState.groupType,
      rings: settings.ring,
    };

    goto('/dashboard');
  }

  async function openCreateGroup() {
    const sdk = await initSdk(address);
    $circles = sdk;

    // Initialize a fresh context with feeCollection defaulted to this safe address
    resetCreateGroupContext(address as `0x${string}`);

    popupControls.open({
      title: 'Create group',
      component: CreateGroup,
      props: {
        setGroup: async (address: string) => {
          // On success, navigate into the new group#
          console.log(`Open the new group avatar dashboard. Address:`, address);
          refreshGroupsCallback?.();
        },
      },
      // Ensure state is cleared if the user closes the flow
      onClose: () => resetCreateGroupContext(),
    });
  }
</script>

<div class="w-full border rounded-lg flex flex-col p-4 shadow-sm">
  <button
    onclick={() => connectAvatar(address)}
    class="flex justify-between items-center hover:bg-base-200 rounded-lg p-2"
  >
    <Avatar topInfo="Safe" {address} clickable={false} view="horizontal" />
    <div class="btn btn-xs btn-outline btn-primary">
      {#if !isRegistered}
        register
      {:else}
        V2
      {/if}
    </div>
  </button>
  <div class="w-full flex gap-x-2 items-center justify-between mt-6 px-2">
    <p class="font-bold text-primary">My groups</p>
    <button
      onclick={() => openCreateGroup()}
      class="btn btn-xs btn-outline btn-primary"
      >Create a group
    </button>
  </div>
  <div class="w-full pl-6 flex flex-col gap-y-2 mt-2">
    {#each groups ?? [] as group}
      <button
        class="flex w-full hover:bg-base-200 rounded-lg p-2"
        onclick={() => connectAvatar(group.group as `0x${string}`)}
      >
        <Avatar
          address={group.group as `0x${string}`}
          clickable={false}
          view="horizontal"
          topInfo={group.group}
        />
      </button>
    {/each}
    {#if (groups ?? []).length === 0}
      <p class="text-sm">No groups available.</p>
    {/if}
  </div>
</div>
