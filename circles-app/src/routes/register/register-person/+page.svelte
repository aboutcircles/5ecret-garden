<script lang="ts">
  import { goto } from '$app/navigation';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import type { Avatar as AvatarType } from '@circles-sdk/sdk';
  import { circles } from '$lib/stores/circles';
  import { wallet } from '$lib/stores/wallet.svelte';
  import type { AvatarRow } from '@circles-sdk/data';
  import type { Profile } from '@circles-sdk/profiles';
  import { onMount } from 'svelte';
  import type { Address } from '@circles-sdk/utils';
  import ProfileEditor from '$lib/components/ProfileEditor.svelte';
  import { environment } from '$lib/stores/environment.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import Disclaimer from '$lib/components/Disclaimer.svelte';

  let invitations: AvatarRow[] = $state([]);
  let inviterSelected: Address | undefined = $state(
    environment.ring ? '0x0000000000000000000000000000000000000000' : undefined
  );

  let profile: Profile = $state({
    name: '',
    description: '',
    previewImageUrl: '',
    imageUrl: undefined,
  });

  onMount(async () => {
    if (!$wallet?.address) {
      throw new Error('Wallet not connected');
    }
    if (!$circles?.data) {
      throw new Error('Circles SDK not initialized');
    }

    invitations = await $circles.data.getInvitations(
      $wallet.address.toLowerCase() as Address
    );
    if (environment.ring) {
      invitations = [
        ...invitations,
        {
          avatar: '0x0000000000000000000000000000000000000000',
          timestamp: 0,
          transactionHash: '',
          version: 2,
          type: 'CrcV2_RegisterHuman',
          hasV1: true,
          isHuman: false,
          blockNumber: 0,
          transactionIndex: 0,
          logIndex: 0,
        },
      ];
    }
  });

  async function registerHuman() {
    if (!$circles) {
      throw new Error('Wallet not connected ($circles is undefined)');
    }
    if (!inviterSelected) {
      throw new Error('Inviter not set');
    }

    //TODO: why need to bind it as Avatar
    avatarState.avatar = (await $circles.acceptInvitation(
      inviterSelected.toLowerCase() as Address,
      profile
    )) as AvatarType;

    await goto('/dashboard');
  }
</script>

<div
  class="w-full flex flex-col max-w-xl gap-y-4 justify-center mt-28 md:mt-44"
>
  <div class="w-full">
    <button onclick={() => history.back()}>
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </button>
  </div>
  <Disclaimer />
  <div
    class="border rounded-lg flex flex-col items-center p-4 w-full shadow-sm"
  >
    <p class="text-lg">Register person</p>
    <div class="w-full">
      <ul class="steps steps-vertical">
        <li class="step step-primary">Select Inviter</li>
      </ul>
      <div class="flex gap-y-2 gap-x-2 pl-10 text-sm">
        {#if invitations.length > 0}
          {#each invitations as inviter}
            <div class="flex items-center gap-x-2 border rounded-md p-2">
              <input
                type="radio"
                name="radio-7"
                class="radio radio-success radio-sm"
                checked={inviterSelected === inviter.avatar}
                onclick={() => inviterSelected = inviter.avatar}
              /><Avatar
                topInfo="Inviter"
                clickable={false}
                address={inviter.avatar}
                view="horizontal"
              />
            </div>
          {/each}
        {:else}
          No invitations pending. <a
            href="/link-to-telegram"
            class="underline flex items-center"
            >Get help
            <img
              src="/external.svg"
              alt="external icon"
              class="h-3 w-3 ml-1"
            /></a
          >
        {/if}
      </div>
      <ul class="steps steps-vertical mt-4">
        <li
          data-content="2"
          class={`step ${inviterSelected ? 'step-primary' : ''}`}
        >
          Register
        </li>
      </ul>
      <div class="flex flex-col items-center gap-y-4 pl-10">
        {#if inviterSelected}
          <ProfileEditor bind:profile />
          <div class="mx-auto">
            <ActionButton
              action={registerHuman}
              disabled={profile.name.trim().length < 1}
            >
              Create
            </ActionButton>
          </div>
        {:else}
          <img src="/lock.svg" alt="lock icon" class="h-7 w-7" />
          <p>Select an inviter to continue</p>
        {/if}
      </div>
    </div>
  </div>
</div>
