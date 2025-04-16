<script lang="ts">
  import ConnectWallet from '$lib/components/ConnectWallet.svelte';
  import { environment } from '$lib/stores/environment.svelte';
  import { onMount } from 'svelte';

  let hasBrowserWallet = $state(false);
  onMount(() => {
    hasBrowserWallet = typeof (window as any).ethereum !== 'undefined';
  });
</script>

<div class="w-full flex flex-col min-h-screen max-w-xl gap-y-4 justify-center">
  <div class="w-full">
    <a href="/">
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </a>
  </div>
  <div class="flex items-center justify-between gap-x-2">
    <p class="font-bold text-xl">Access Circles</p>
    <div class="flex items-center gap-x-2">
      <input
        type="checkbox"
        checked={environment.ring}
        class="toggle toggle-sm checked:bg-orange-400 checked:text-orange-800"
        onchange={() => (environment.ring = !environment.ring)}
      />
      <a
        href="https://docs.aboutcircles.com/developer-docs/getting-started-with-the-sdk#using-the-sandbox-version-of-circles-sdk-for-builders"
        class={`flex font-semibold items-center text-sm text-nowrap ${
          environment.ring
            ? 'text-orange-700'
            : 'text-primary hover:text-primary/80'
        }`}
      >
        RINGS<img
          src="/external.svg"
          alt="external icon"
          class="h-3 w-3 ml-1"
        />
      </a>
    </div>
  </div>
  <ConnectWallet
    imgUrl="/safe.png"
    header="Use Safe"
    desc={hasBrowserWallet
      ? 'Use Circles with Safe and MetaMask or any compatible browser wallet'
      : 'Not available'}
    route={hasBrowserWallet
      ? '/connect-wallet/connect-safe'
      : '/connect-wallet'}
    recommended="Connect"
  />
  <ConnectWallet
    imgUrl="/fox.png"
    header="Use MetaMask"
    desc={hasBrowserWallet
      ? 'Use Circles with MetaMask or any compatible browser wallet'
      : 'Not available'}
    route={hasBrowserWallet
      ? '/connect-wallet/connect-metamask'
      : '/connect-wallet'}
  />
  <ConnectWallet
    imgUrl="/logo.svg"
    header="circles.garden"
    desc="Use your circles.garden key in 5ecret-garden"
    route="/connect-wallet/import-circles-garden"
  />
</div>
