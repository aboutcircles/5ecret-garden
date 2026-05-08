<script lang="ts">
    import {goto} from '$app/navigation';
    import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
    import {avatarState} from '$lib/shared/state/avatar.svelte';
    import {circles} from '$lib/shared/state/circles';
    import type {Avatar} from '@circles-sdk/sdk';
    import type {Profile} from '@circles-sdk/profiles';
    import Disclaimer from '$lib/areas/register/ui/components/RegistrationDisclaimer.svelte';
    import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';
    import { ArrowLeft as LArrowLeft } from 'lucide';
    import ActionButtonBar from '$lib/shared/ui/shell/ActionButtonBar.svelte';
    import ActionButtonDropDown from '$lib/shared/ui/shell/ActionButtonDropDown.svelte';
    import type { Action } from '$lib/shared/ui/shell/actions';
    import { T } from '$lib/design-system/tokens.js';

    let profile: Profile = $state({name: '', description: '', previewImageUrl: '', imageUrl: undefined});

    async function registerOrganization() {
        if (!$circles) throw new Error('Wallet not connected ($circles is undefined)');
        avatarState.avatar = await $circles.registerOrganizationV2(profile) as Avatar;
        await goto('/dashboard');
    }

    function goBack() { history.back(); }

    const actions: Action[] = [
      { id: 'back', label: 'Back', iconNode: LArrowLeft, onClick: goBack, variant: 'ghost' },
    ];
  </script>

<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg" contentWidthClass="page page--lg" usePagePadding={true}>
  {#snippet title()}
    <h1 class="h2 m-0">Register Organization</h1>
  {/snippet}
  {#snippet meta()}Step 1 of 1{/snippet}
  {#snippet headerActions()}
    <ActionButtonBar {actions} />
  {/snippet}
  {#snippet collapsedLeft()}
    <div class="truncate flex items-center gap-2">
      <span class="font-medium">Register Organization</span>
    </div>
  {/snippet}
  {#snippet collapsedMenu()}
    <ActionButtonDropDown {actions} />
  {/snippet}

  <div style="margin-top:12px;">
    <Disclaimer/>
  </div>

  <section style="margin-top:18px;display:flex;flex-direction:column;gap:8px;">
    <h2 style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;margin:0 0 4px 4px;">Register</h2>

    <div style="
      background:linear-gradient(160deg,{T.lilacSoft} 0%,{T.surface} 60%,{T.coralSoft} 100%);
      border:1px solid {T.hairlineSoft};border-radius:18px;
      box-shadow:{T.shadow.xs};
      padding:28px 22px;
      display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;
    ">
      <div style="
        width:72px;height:72px;border-radius:18px;
        background:rgba(255,255,255,0.7);
        display:inline-flex;align-items:center;justify-content:center;
      ">
        <img src="/organization.svg" alt="organization" style="width:44px;height:44px;"/>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;width:100%;max-width:360px;">
        <div>
          <h3 style="font-family:{T.fontDisplay};font-size:24px;color:{T.ink};letter-spacing:-0.015em;line-height:1.2;font-weight:400;margin:0;">
            Register organization
          </h3>
          <p style="font-size:12.5px;color:{T.inkMuted};margin:4px 0 0 0;line-height:1.5;">
            Pick a name your community will recognise.
          </p>
        </div>

        <label style="display:flex;flex-direction:column;gap:6px;text-align:left;">
          <span style="font-size:10px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Name</span>
          <input
            bind:value={profile.name}
            type="text"
            style="width:100%;padding:10px 14px;border:1px solid {T.hairline};border-radius:10px;font-family:{T.fontSans};font-size:13px;color:{T.ink};background:{T.surface};box-sizing:border-box;"
            placeholder="Acme DAO"
          />
        </label>

        <ActionButton action={registerOrganization} disabled={profile.name.trim().length < 1} class="btn btn-primary w-full">Create organization</ActionButton>
      </div>
    </div>
  </section>
</PageScaffold>
