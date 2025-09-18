<script lang="ts">
    import {goto} from '$app/navigation';
    import ActionButton from '$lib/components/ActionButton.svelte';
    import {avatarState} from '$lib/stores/avatar.svelte';
    import {circles} from '$lib/stores/circles';
    import type {Avatar} from '@circles-sdk/sdk';
    import type {Profile} from '@circles-sdk/profiles';
    import Disclaimer from '$lib/components/Disclaimer.svelte';
    import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
    import Lucide from '$lib/icons/Lucide.svelte';
    import { ArrowLeft as LArrowLeft } from 'lucide';

    let profile: Profile = $state({name: '', description: '', previewImageUrl: '', imageUrl: undefined});

    async function registerOrganization() {
        if (!$circles) throw new Error('Wallet not connected ($circles is undefined)');
        avatarState.avatar = await $circles.registerOrganizationV2(profile) as Avatar;
        await goto('/dashboard');
    }
</script>

<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg" contentWidthClass="page page--lg" usePagePadding={true} headerTopGapClass="mt-4 md:mt-6" collapsedTopGapClass="mt-3 md:mt-4">
  <svelte:fragment slot="title">
    <h1 class="h2 m-0">Register Organization</h1>
  </svelte:fragment>
  <svelte:fragment slot="meta">Step 1 of 1</svelte:fragment>
  <svelte:fragment slot="actions">
    <button type="button" class="btn btn-ghost btn-sm" onclick={() => history.back()} aria-label="Back">
      <Lucide icon={LArrowLeft} size={16} class="shrink-0 stroke-black" />
      <span>Back</span>
    </button>
  </svelte:fragment>
  <svelte:fragment slot="collapsed-left">
    <div class="truncate flex items-center gap-2">
      <span class="font-medium">Register Organization</span>
    </div>
  </svelte:fragment>
  <svelte:fragment slot="collapsed-menu">
    <button type="button" class="btn btn-ghost min-h-0 h-[var(--collapsed-h)] md:h-[var(--collapsed-h-md)] w-full justify-start px-3" onclick={() => history.back()} aria-label="Back">
      <Lucide icon={LArrowLeft} size={20} class="shrink-0 stroke-black" />
      <span>Back</span>
    </button>
  </svelte:fragment>

  <div class="mt-3">
    <Disclaimer/>
  </div>

  <section class="mt-4">
    <h2 class="text-sm font-semibold text-base-content/70 tracking-wide uppercase">Register</h2>
    <div class="mt-2 space-y-2">
      <div class="bg-base-100 border rounded-xl px-4 py-3 shadow-sm">
        <div class="flex flex-col items-center text-center gap-4">
          <img src="/organization.svg" alt="organization" class="w-16 h-16 rounded-xl"/>
          <div class="space-y-4 w-full max-w-md">
            <h3 class="text-xl font-semibold">Register organization</h3>
            <label class="form-control w-full">
              <span class="label-text">Name</span>
              <input bind:value={profile.name} type="text" class="input input-bordered w-full"/>
            </label>
            <ActionButton action={registerOrganization} disabled={profile.name.trim().length < 1}>Create</ActionButton>
          </div>
        </div>
      </div>
    </div>
  </section>
</PageScaffold>
