<script lang="ts">
    import { circles } from '$lib/shared/state/circles';
    import { wallet } from '$lib/shared/state/wallet.svelte';
    import type { Profile } from '@circles-sdk/profiles';
    import { ProfileFormStep } from '$lib/shared/ui/profile';
    import { onMount } from 'svelte';
    import Disclaimer from '$lib/areas/register/ui/components/RegistrationDisclaimer.svelte';
    import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
    import { ArrowLeft as LArrowLeft } from 'lucide';
    import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
    import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
    import type { Action } from '$lib/shared/ui/shell/actions';
    import { requireCircles } from '$lib/shared/flow/guards';
    import { get } from 'svelte/store';

    let profile: Profile = $state({ name: '', description: '', previewImageUrl: '', imageUrl: undefined });

    onMount(async () => {
        const sdk = requireCircles(get(circles));
        if ($wallet?.address) {
            const cid = await sdk.data?.getMetadataCidForAddress($wallet.address);
            profile = cid ? ((await sdk.profiles?.get(cid)) ?? profile) : profile;
        }
    });

    async function registerProfile() {
      const sdk = requireCircles(get(circles));
      await sdk.createOrUpdateProfile(profile);
    }

    function goBack() { history.back(); }
    const actions: Action[] = [
      { id: 'back', label: 'Back', iconNode: LArrowLeft, onClick: goBack, variant: 'ghost' },
    ];
  </script>

<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg" contentWidthClass="page page--lg" usePagePadding={true} headerTopGapClass="mt-4 md:mt-6" collapsedTopGapClass="mt-3 md:mt-4">
  {#snippet title()}<h1 class="h2 m-0">Register Profile</h1>{/snippet}
  {#snippet meta()}Step 1 of 1{/snippet}
  {#snippet headerActions()}
    <ActionButtonBar {actions} />
  {/snippet}
  {#snippet collapsedLeft()}
    <div class="truncate flex items-center gap-2">
      <span class="font-medium">Register Profile</span>
    </div>
  {/snippet}
  {#snippet collapsedMenu()}<ActionButtonDropDown {actions} />{/snippet}

  <div class="mt-3">
    <Disclaimer />
  </div>

  <section class="mt-4">
    <h2 class="text-sm font-semibold text-base-content/70 tracking-wide uppercase">Register</h2>
    <div class="mt-2 space-y-2">
      <div class="bg-base-100 border rounded-xl px-4 py-3 shadow-sm">
        <div class="flex flex-col items-center text-center gap-4">
          <img src="/person.svg" alt="person" class="w-16 h-16 rounded-xl" />
          <h3 class="text-xl font-semibold">Register profile</h3>
          <ProfileFormStep
            bind:name={profile.name}
            bind:description={profile.description}
            bind:previewImageUrl={profile.previewImageUrl}
            bind:imageUrl={profile.imageUrl}
            onSubmit={registerProfile}
            submitLabel="Create"
          />
        </div>
      </div>
    </div>
  </section>
</PageScaffold>
