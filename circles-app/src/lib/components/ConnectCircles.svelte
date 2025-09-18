<script lang="ts">
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import { Sdk } from '@circles-sdk/sdk';
  import { goto } from '$app/navigation';
  import Avatar from './avatar/Avatar.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { CirclesStorage } from '$lib/utils/storage';
  import type { GroupRow } from '@circles-sdk/data';
  import { settings } from '$lib/stores/settings.svelte';
  import { popupControls } from '$lib/stores/popUp';
  import CreateGroup from "$lib/flows/createGroup/1_CreateGroup.svelte";

  interface Props {
    address: Address;
    isRegistered: boolean;
    groups?: GroupRow[];
    isV1?: boolean;
    initSdk: (address: Address) => Promise<Sdk>;
  }

  let { address, isRegistered, groups, isV1, initSdk }: Props = $props();

  async function connectAvatar(groupAddress?: Address) {
    const sdk = await initSdk(address);
    $circles = sdk;

    if (groupAddress === undefined && !isRegistered) {
      await goto('/register');
      return;
    }
    avatarState.avatar = await sdk.getAvatar(groupAddress ?? address);
    avatarState.isGroup = groupAddress ? true : false;
    avatarState.groupType = groupAddress
      ? await sdk.getGroupType(groupAddress)
      : undefined;
    CirclesStorage.getInstance().data = {
      avatar: address,
      group: groupAddress,
      isGroup: avatarState.isGroup,
      groupType: avatarState.groupType,
      rings: settings.ring,
      legacy: settings.legacy,
    };


    await goto('/dashboard');
  }


  async function openCreateGroup() {
    const sdk = await initSdk(address);
    $circles = sdk;
      popupControls.open({
          title: "Create group",
          component: CreateGroup,
          props: {
              setGroup: async (address: string, name: string, symbol: string, treasury: string, cidV0Digest: string) => {
                  // TODO: Open the new group's dashboard
                  connectAvatar(address as Address);
                  await goto('/dashboard');
              }
          }
      });
  }

  // async function deployGroup() {
  //
  //   const sdk = await initSdk(address);
  //   $circles = sdk;
  //   popupControls.open({
  //     component: CreateGroupForm,
  //     title: 'Create group',
  //     props: {
  //       setGroup: (address: string, name: string, symbol: string, treasury: string, cidV0Digest: string) => {
  //         groups?.push({
  //           group: address,
  //           name: name,
  //           symbol: symbol,
  //           type: 'CrcV2_CMGroupCreated',
  //           treasury: treasury,
  //           cidV0Digest: cidV0Digest,
  //           blockNumber: 0,
  //           timestamp: 0,
  //           transactionIndex: 0,
  //           logIndex: 0,
  //           memberCount: 0,
  //           mintPolicy: '0xcCa27c26CF7BAC2a9928f42201d48220F0e3a549',
  //         });
  //       },
  //     },
  //   });
  // }
</script>

<div class="w-full border rounded-lg flex flex-col p-4 shadow-sm">
  <button
    onclick={() => connectAvatar()}
    class="flex justify-between items-center hover:bg-base-200 rounded-lg p-2"
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
      onclick={() => openCreateGroup()}
      class="btn btn-xs btn-outline btn-primary">Create a group</button
    >
  </div>
  <div class="w-full pl-6 flex flex-col gap-y-2 mt-2">
    {#each groups ?? [] as group}
      <button
        class="flex w-full hover:bg-base-200 rounded-lg p-2"
        onclick={() => connectAvatar(group.group)}
      >
        <Avatar
          address={group.group}
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
