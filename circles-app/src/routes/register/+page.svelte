<script lang="ts">
  import { wallet } from '$lib/shared/state/wallet.svelte';
  import { page } from '$app/stores';
  import { circles } from '$lib/shared/state/circles';
  import { getBaseAndCmgGroupsByOwnerBatch } from '$lib/shared/utils/getGroupsByOwnerBatch';
  import type { Address as EvmAddress } from '@aboutcircles/sdk-types';
  import { goto } from '$app/navigation';
  import QrCode from '$lib/shared/ui/primitives/QrCode.svelte';
  import Address from '$lib/shared/ui/primitives/Address.svelte';
  import ConnectWallet from '$lib/areas/wallet/ui/onboarding/ConnectWallet.svelte';
  import Disclaimer from '$lib/areas/register/ui/components/RegistrationDisclaimer.svelte';
  import PageScaffold from '$lib/shared/ui/shell/PageScaffold.svelte';

  const ownerAddress = $derived(($page.url.searchParams.get('owner') ?? '').trim().toLowerCase() as EvmAddress | '');
  const shortAddr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

  let ownerHasGroups: boolean = $state(false);
  let ownerGroupsLoading: boolean = $state(false);

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

  $effect(() => {
    void loadOwnerGroupsFlag();
  });

  function openManageGroups() {
    if (!ownerAddress) return;
    goto('/groups');
  }
</script>


<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg" contentWidthClass="page page--lg" usePagePadding={true} headerTopGapClass="mt-4 md:mt-6" collapsedTopGapClass="mt-3 md:mt-4">
  {#snippet title()}
    <h1 class="h2 m-0">{ownerAddress ? shortAddr(ownerAddress) : 'Create Account'}</h1>
  {/snippet}
  {#snippet meta()}
    {#if ownerAddress}
      Connected safe
    {:else}
      Takes ~2 minutes
    {/if}
  {/snippet}
  {#snippet headerActions()}
    {#if ownerAddress}
      <button class="btn btn-sm btn-primary" onclick={() => goto('/register')}>Create account</button>
      {#if ownerGroupsLoading}
        <button class="btn btn-sm btn-ghost" disabled>Checking groups…</button>
      {:else if ownerHasGroups}
        <button class="btn btn-sm btn-ghost" onclick={openManageGroups}>My groups</button>
      {/if}
    {/if}
  {/snippet}
  {#snippet collapsedLeft()}
    <div class="truncate flex items-center gap-2">
      <span class="font-medium">{ownerAddress ? shortAddr(ownerAddress) : 'Create Account'}</span>
    </div>
  {/snippet}

  <!-- Warning/banner spacing -->
  <div class="mt-3">
    <Disclaimer />
  </div>

  <!-- Register section -->
  <section class="mt-4">
    <h2 class="text-sm font-semibold text-base-content/70 tracking-wide uppercase">Register</h2>
    <div class="mt-2 space-y-2">
      <div class="text-md text-base-content/70">
        You're not yet signed up to Circles. Choose an account type that matches your needs.
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
        desc="Register as an organization if you're a business"
        route="/register/register-organization"
      />
    </div>
  </section>

  <!-- Advanced section -->
  <section class="mt-4">
    <h2 class="text-sm font-semibold text-base-content/70 tracking-wide uppercase">Advanced</h2>
    <div class="mt-2 space-y-2">
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
    </div>
  </section>

  <!-- QR section -->
  <section class="mt-8">
    <div class="text-center">
      <div class="text-xs text-base-content/70 mb-2">
        <Address address={$wallet?.address ?? '0x0'} />
      </div>
      <div class="inline-block bg-base-100 border rounded-xl p-3">
        <QrCode value={$wallet?.address} />
      </div>
    </div>
  </section>
</PageScaffold>
