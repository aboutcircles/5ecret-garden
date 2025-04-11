<script lang="ts">
  import { wallet } from '$lib/stores/wallet';
  import QrCode from '$lib/components/QrCode.svelte';
  import Address from '$lib/components/Address.svelte';
  import ConnectWallet from '$lib/components/ConnectWallet.svelte';
</script>

<div
  class="w-full flex flex-col max-w-xl gap-y-4 justify-center mt-28 md:mt-44"
>
  <div class="w-full flex flex-col">
    <p class="font-bold text-xl">Register</p>
    <p class="text-md text-black/60">
      You're not yet signed up to Circles. Choose an avatar type that matches
      your needs.
    </p>
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
  <div class="mt-4">
    <p class="font-bold text-xl">Advanced</p>
  </div>
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
  <div class="w-full flex flex-col items-center">
    <Address address={$wallet?.address ?? '0x0'} />
    <QrCode value={$wallet?.address} />
  </div>
</div>
