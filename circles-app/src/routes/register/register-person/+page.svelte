<script lang="ts">
  import { goto } from '$app/navigation';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import { wallet } from '$lib/stores/wallet.svelte';
  import type { AvatarInfo, Profile, Address } from '@aboutcircles/sdk-types';
  import { onMount } from 'svelte';
  import ProfileEditor from '$lib/components/ProfileEditor.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import Disclaimer from '$lib/components/Disclaimer.svelte';
  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
  import Lucide from '$lib/icons/Lucide.svelte';
  import {
    ArrowLeft as LArrowLeft,
    ExternalLink as LExternalLink,
    Lock as LLock,
  } from 'lucide';
  import RowFrame from '$lib/ui/RowFrame.svelte';
  import { CirclesStorage } from '$lib/utils/storage';

  let invitations: AvatarInfo[] = $state([]);
  let inviterSelected: Address | undefined = $state(
    settings.ring ? '0x0000000000000000000000000000000000000000' : undefined
  );

  let profile: Profile = $state({
    name: '',
    description: '',
    previewImageUrl: '',
    imageUrl: undefined,
  });

  onMount(async () => {
    if (!$wallet?.address) throw new Error('Wallet not connected');
    if (!$circles?.rpc) throw new Error('Circles SDK not initialized');

    invitations = await $circles.rpc.invitation.getInvitations(
      $wallet.address.toLowerCase() as Address
    );
    if (settings.ring) {
      invitations = [
        ...invitations,
        {
          avatar: '0x0000000000000000000000000000000000000000',
          version: 2,
          isHuman: false,
          invited_by: null,
        } as any,
      ];
    }
  });

  async function registerHuman() {
    if (!$circles)
      throw new Error('Wallet not connected ($circles is undefined)');
    if (!inviterSelected) throw new Error('Inviter not set');

    // Register the human
    avatarState.avatar = (await $circles.register.asHuman(
      inviterSelected.toLowerCase() as Address,
      profile
    )) as any;

    if (!avatarState.avatar) {
      throw new Error('Failed to register human');
    }

    // Set avatar state flags for humans
    avatarState.isGroup = false;
    avatarState.isHuman = true;
    avatarState.groupType = undefined;

    // Set version to 2 for SDK v2 avatars
    if (avatarState.avatar.avatarInfo) {
      avatarState.avatar.avatarInfo.version = 2;
    }

    // Save to storage
    CirclesStorage.getInstance().data = {
      avatar: avatarState.avatar.address,
      group: undefined,
      isGroup: false,
      groupType: undefined,
      rings: settings.ring,
    };

    await goto('/dashboard');
  }
</script>

<PageScaffold
  highlight="soft"
  collapsedMode="bar"
  collapsedHeightClass="h-12"
  maxWidthClass="page page--lg"
  contentWidthClass="page page--lg"
  usePagePadding={true}
  headerTopGapClass="mt-4 md:mt-6"
  collapsedTopGapClass="mt-3 md:mt-4"
>
  <svelte:fragment slot="title"
    ><h1 class="h2 m-0">Register Person</h1></svelte:fragment
  >
  <svelte:fragment slot="meta">Step 1 of 2</svelte:fragment>
  <svelte:fragment slot="actions">
    <button
      type="button"
      class="btn btn-ghost btn-sm"
      onclick={() => history.back()}
      aria-label="Back"
    >
      <Lucide icon={LArrowLeft} size={16} class="shrink-0 stroke-black" />
      <span>Back</span>
    </button>
  </svelte:fragment>

  <div class="mt-3"><Disclaimer /></div>

  <section class="mt-4">
    <h2
      class="text-sm font-semibold text-base-content/70 tracking-wide uppercase"
    >
      Register
    </h2>
    <div class="mt-2 space-y-2">
      <div
        class="bg-base-100 border rounded-xl px-4 py-3 shadow-sm flex flex-col items-center w-full"
      >
        <p class="text-lg">Register person</p>
        <div class="w-full">
          <ul class="steps steps-vertical">
            <li class="step step-primary">Select Inviter</li>
          </ul>

          <!-- Invitations list -->
          <div class="flex flex-col gap-y-2 pl-10 text-sm">
            {#if invitations.length > 0}
              {#each invitations as inviter (inviter.avatar)}
                <RowFrame
                  clickable={true}
                  dense={true}
                  noLeading={true}
                  on:click={() => (inviterSelected = inviter.avatar)}
                >
                  <div class="flex items-center gap-x-2 min-w-0">
                    <input
                      type="radio"
                      name="inviter"
                      class="radio radio-success radio-sm"
                      checked={inviterSelected === inviter.avatar}
                      onclick={(e) => {
                        e.stopPropagation();
                        inviterSelected = inviter.avatar;
                      }}
                    />
                    <Avatar
                      topInfo="Inviter"
                      clickable={false}
                      address={inviter.avatar}
                      view="horizontal"
                    />
                  </div>
                </RowFrame>
              {/each}
            {:else}
              No invitations pending. <a
                href="/link-to-telegram"
                class="underline inline-flex items-center"
              >
                Get help <Lucide
                  icon={LExternalLink}
                  size={12}
                  class="shrink-0 stroke-black ml-1"
                  ariaLabel=""
                />
              </a>
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
              <Lucide
                icon={LLock}
                size={28}
                class="shrink-0 stroke-black"
                ariaLabel=""
              />
              <p>Select an inviter to continue</p>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </section>
</PageScaffold>
