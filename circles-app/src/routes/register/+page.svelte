<script lang="ts">
  import { wallet } from '$lib/stores/wallet.svelte';
  import QrCode from '$lib/components/QrCode.svelte';
  import Address from '$lib/components/Address.svelte';
  import ConnectWallet from '$lib/components/ConnectWallet.svelte';
  import Disclaimer from '$lib/components/Disclaimer.svelte';
  import PageScaffold from '$lib/components/layout/PageScaffold.svelte';
</script>


<PageScaffold highlight="soft" collapsedMode="bar" collapsedHeightClass="h-12" maxWidthClass="page page--lg" contentWidthClass="page page--lg" usePagePadding={true} headerTopGapClass="mt-4 md:mt-6" collapsedTopGapClass="mt-3 md:mt-4">
  <svelte:fragment slot="title">
    <h1 class="h2 m-0">Create Account</h1>
  </svelte:fragment>
  <svelte:fragment slot="meta">
    Takes ~2 minutes
  </svelte:fragment>
  <svelte:fragment slot="collapsed-left">
    <div class="truncate flex items-center gap-2">
      <span class="font-medium">Create Account</span>
    </div>
  </svelte:fragment>

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
