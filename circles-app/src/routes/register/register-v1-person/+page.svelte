<script lang="ts">
    import {goto} from '$app/navigation';
    import ActionButton from '$lib/components/ActionButton.svelte';
    import Disclaimer from '$lib/components/Disclaimer.svelte';
    import {avatarState} from '$lib/stores/avatar.svelte';
    import {circles} from '$lib/stores/circles';
    import type {Avatar} from '@circles-sdk/sdk';
    import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
    import Lucide from '$lib/icons/Lucide.svelte';
    import { ArrowLeft as LArrowLeft } from 'lucide';

    async function registerHuman() {
        if (!$circles) {
            throw new Error('Wallet not connected ($circles is undefined)');
        }

        //TODO: why need to bind it as Avatar
        avatarState.avatar = (await $circles.registerHuman()) as Avatar;

        await goto('/dashboard');
    }
</script>


<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg" contentWidthClass="page page--lg" usePagePadding={true} headerTopGapClass="mt-4 md:mt-6" collapsedTopGapClass="mt-3 md:mt-4">
  <svelte:fragment slot="title"><h1 class="h2 m-0">Register Person (v1)</h1></svelte:fragment>
  <svelte:fragment slot="meta">Step 1 of 1</svelte:fragment>
  <svelte:fragment slot="actions">
    <button type="button" class="btn btn-ghost btn-sm" onclick={() => history.back()} aria-label="Back">
      <Lucide icon={LArrowLeft} size={16} class="shrink-0 stroke-black" />
      <span>Back</span>
    </button>
  </svelte:fragment>
  <svelte:fragment slot="collapsed-left">
    <div class="truncate flex items-center gap-2">
      <span class="font-medium">Register (v1)</span>
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
          <img src="/person.svg" alt="Shoes" class="w-16 h-16 rounded-xl"/>
          <h3 class="text-xl font-semibold">Register person</h3>
          <div>
            <ActionButton action={registerHuman}>Create</ActionButton>
          </div>
        </div>
      </div>
    </div>
  </section>

</PageScaffold>