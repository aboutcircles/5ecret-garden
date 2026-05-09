<script lang="ts">
    import {goto} from '$app/navigation';
    import ActionButton from '$lib/shared/ui/primitives/ActionButton.svelte';
    import Disclaimer from '$lib/areas/register/ui/components/RegistrationDisclaimer.svelte';
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


<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg" contentWidthClass="page page--lg" usePagePadding={true}>
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

  <div style="margin-top:12px;">
    <Disclaimer/>
  </div>

  <section style="margin-top:16px;">
    <h2 style="font-size:11px;font-weight:600;color:rgba(15,10,30,0.62);letter-spacing:0.06em;text-transform:uppercase;margin:0 0 8px 0;">Register</h2>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <div style="background:#FFFFFF;border:1px solid rgba(31,17,70,0.08);border-radius:12px;padding:16px 12px;box-shadow:0 1px 2px rgba(15,10,30,0.04);">
        <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;">
          <img src="/person.svg" alt="Shoes" style="width:64px;height:64px;border-radius:12px;"/>
          <h3 style="font-size:20px;font-weight:600;margin:0;">Register person</h3>
          <div>
            <ActionButton action={registerHuman}>Create</ActionButton>
          </div>
        </div>
      </div>
    </div>
  </section>

</PageScaffold>
