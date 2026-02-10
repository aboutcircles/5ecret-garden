<script lang="ts">
    import {goto} from '$app/navigation';
    import ActionButton from '$lib/shared/ui/common/ActionButton.svelte';
    import Disclaimer from '$lib/shared/ui/common/Disclaimer.svelte';
    import {avatarState} from '$lib/shared/state/avatar.svelte';
    import {circles} from '$lib/shared/state/circles';
    import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
    import { ArrowLeft as LArrowLeft } from 'lucide';
    import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
    import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
    import type { Action } from '$lib/shared/ui/shell/actions';

    async function registerHuman() {
        if (!$circles) {
            throw new Error('Wallet not connected ($circles is undefined)');
        }

        avatarState.avatar = await $circles.registerHuman();

        await goto('/dashboard');
    }

    function goBack() { history.back(); }
    const actions: Action[] = [
      { id: 'back', label: 'Back', iconNode: LArrowLeft, onClick: goBack, variant: 'ghost' },
    ];
  </script>


<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg" contentWidthClass="page page--lg" usePagePadding={true} headerTopGapClass="mt-4 md:mt-6" collapsedTopGapClass="mt-3 md:mt-4">
  {#snippet title()}<h1 class="h2 m-0">Register Person (v1)</h1>{/snippet}
  {#snippet meta()}Step 1 of 1{/snippet}
  {#snippet headerActions()}
    <ActionButtonBar {actions} />
  {/snippet}
  {#snippet collapsedLeft()}
    <div class="truncate flex items-center gap-2">
      <span class="font-medium">Register (v1)</span>
    </div>
  {/snippet}
  {#snippet collapsedMenu()}<ActionButtonDropDown {actions} />{/snippet}

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
