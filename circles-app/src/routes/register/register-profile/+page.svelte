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

<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg" contentWidthClass="page page--lg" usePagePadding={true}>
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

  <div style="margin-top:12px;">
    <Disclaimer />
  </div>

  <section style="margin-top:16px;">
    <h2 style="font-size:11px;font-weight:600;color:rgba(15,10,30,0.62);letter-spacing:0.06em;text-transform:uppercase;margin:0 0 8px 0;">Register</h2>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <div style="background:#FFFFFF;border:1px solid rgba(31,17,70,0.08);border-radius:12px;padding:16px 12px;box-shadow:0 1px 2px rgba(15,10,30,0.04);">
        <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;">
          <img src="/person.svg" alt="person" style="width:64px;height:64px;border-radius:12px;" />
          <h3 style="font-size:20px;font-weight:600;margin:0;">Register profile</h3>
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
