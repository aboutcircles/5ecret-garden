<script lang="ts">
  import { wallet } from '$lib/shared/state/wallet.svelte';
  import { page } from '$app/stores';
  import { circles } from '$lib/shared/state/circles';
  import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/shared/utils/getGroupsByOwnerBatch';
  import type { Address as EvmAddress } from '@circles-sdk/utils';
  import { goto } from '$app/navigation';
  import QrCode from '$lib/shared/ui/primitives/QrCode.svelte';
  import ConnectWallet from '$lib/areas/wallet/ui/onboarding/ConnectWallet.svelte';
  import Disclaimer from '$lib/areas/register/ui/components/RegistrationDisclaimer.svelte';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

  const ownerAddress = $derived(($page.url.searchParams.get('owner') ?? '').trim().toLowerCase() as EvmAddress | '');
  const shortAddr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
  const fullAddr = $derived($wallet?.address ?? ownerAddress ?? '');

  let ownerHasGroups: boolean = $state(false);
  let ownerGroupsLoading: boolean = $state(false);
  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  async function loadOwnerGroupsFlag() {
    if (!ownerAddress || !$circles) {
      ownerHasGroups = false;
      return;
    }
    try {
      ownerGroupsLoading = true;
      const byOwner = await getBaseAndCmgGroupsByOwnerBatch($circles, [ownerAddress]);
      const rows = byOwner[ownerAddress] ?? byOwner[ownerAddress.toLowerCase() as EvmAddress] ?? [];
      ownerHasGroups = rows.length > 0;
    } catch {
      ownerHasGroups = false;
    } finally {
      ownerGroupsLoading = false;
    }
  }

  $effect(() => { void loadOwnerGroupsFlag(); });

  async function copyAddr() {
    if (!fullAddr) return;
    await navigator.clipboard.writeText(String(fullAddr));
    copied = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copied = false; }, 1500);
  }
</script>

<div style="background:{T.page};min-height:100%;width:100%;font-family:{T.fontSans};color:{T.inkBody};">
  <div style="padding:8px 18px 24px;" class="md:!p-9 md:max-w-[1280px] md:mx-auto">

    <!-- Page header -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:8px 0 14px;">
      <div style="display:flex;flex-direction:column;gap:3px;min-width:0;">
        <span style="font-family:{T.fontDisplay};font-size:32px;color:{T.ink};letter-spacing:-0.02em;line-height:1;font-weight:400;">
          {ownerAddress ? 'Choose account type' : 'Create account'}
        </span>
        <span style="font-size:12.5px;color:{T.inkMuted};">
          {ownerAddress ? `Connected · ${shortAddr(ownerAddress)}` : 'Takes about 2 minutes'}
        </span>
      </div>

      {#if ownerAddress}
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          {#if ownerGroupsLoading}
            <span style="
              display:inline-flex;align-items:center;
              height:38px;padding:0 14px;border-radius:9999px;
              background:{T.surface};color:{T.inkMuted};border:1px solid {T.hairline};
              font-size:13px;
            ">
              <svg class="reg-spin" style="width:12px;height:12px;margin-right:8px;" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" stroke-dasharray="28.3" stroke-dashoffset="9"/>
              </svg>
              Checking groups…
            </span>
          {:else if ownerHasGroups}
            <button
              type="button"
              onclick={() => goto('/groups')}
              style="
                height:38px;padding:0 14px;border-radius:9999px;cursor:pointer;
                background:{T.surface};color:{T.ink};border:1px solid {T.hairline};
                display:inline-flex;align-items:center;gap:6px;
                font-family:{T.fontSans};font-size:13px;font-weight:540;
                box-shadow:{T.shadow.xs};
              "
            >My groups</button>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Disclaimer -->
    <Disclaimer />

    <!-- Register section -->
    <section style="margin-top:18px;display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;flex-direction:column;gap:2px;padding:0 4px;margin-bottom:4px;">
        <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Register</span>
        <span style="font-size:13px;color:{T.inkBody};line-height:1.5;">
          You're not yet signed up to Circles. Choose an account type that matches your needs.
        </span>
      </div>

      <ConnectWallet
        imgUrl="/person.svg"
        header="Human"
        desc="As a person, you need to be invited by someone who already uses Circles"
        route="/register/register-person"
        recommended="Register"
      />
      <ConnectWallet
        imgUrl="/organization.svg"
        header="Organization"
        desc="Register as an organization if you're a business or collective"
        route="/register/register-organization"
      />
    </section>

    <!-- Advanced section -->
    <section style="margin-top:18px;display:flex;flex-direction:column;gap:8px;">
      <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;padding:0 4px;margin-bottom:4px;">Advanced</span>

      <ConnectWallet
        imgUrl="/person.svg"
        header="Human (v1)"
        desc="Register at the Circles v1 Hub"
        route="/register/register-v1-person"
      />
      <ConnectWallet
        imgUrl="/person.svg"
        header="Profile only"
        desc="Create only a profile for the connected address, but no Circles account"
        route="/register/register-profile"
      />
    </section>

    <!-- QR section: address + invitation -->
    {#if fullAddr}
      <section style="
        margin-top:24px;border-radius:22px;overflow:hidden;
        background:{T.surface};border:1px solid {T.hairlineSoft};
        padding:24px 22px;display:flex;flex-direction:column;align-items:center;gap:16px;
        box-shadow:{T.shadow.xs};
      ">
        <div style="display:inline-flex;">
          <QrCode value={fullAddr} />
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;align-items:center;">
          <span style="font-size:11px;font-weight:600;color:{T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Your address</span>
          <span style="font-family:{T.fontMono};font-size:11.5px;color:{T.ink};text-align:center;word-break:break-all;max-width:280px;line-height:1.5;font-weight:540;">
            {fullAddr}
          </span>
        </div>

        <button
          type="button"
          onclick={copyAddr}
          style="
            height:38px;padding:0 18px;border-radius:9999px;cursor:pointer;
            background:{copied ? T.sageSoft : T.surface};color:{copied ? T.positive : T.ink};border:1px solid {copied ? T.sage : T.hairline};
            display:inline-flex;align-items:center;gap:7px;
            font-family:{T.fontSans};font-size:13px;font-weight:540;
            box-shadow:{T.shadow.xs};
            transition:background .12s ease-out,color .12s ease-out,border-color .12s ease-out;
          "
        >
          <Icon name={copied ? 'check' : 'copy'} size={13} stroke={copied ? T.positive : T.inkBody} strokeWidth={2} />
          {copied ? 'Copied!' : 'Copy address'}
        </button>

        <span style="font-size:11px;color:{T.inkMuted};text-align:center;line-height:1.5;max-width:300px;">
          Share this with someone who already uses Circles to receive an invitation.
        </span>
      </section>
    {/if}

    <div style="height:24px;"></div>
  </div>
</div>

<style>
  @keyframes reg-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .reg-spin { animation: reg-spin 0.9s linear infinite; }
</style>
