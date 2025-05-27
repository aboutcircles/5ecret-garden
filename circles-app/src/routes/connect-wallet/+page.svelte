<script lang="ts">
  import { environment } from '$lib/stores/environment.svelte';
  import ConnectWallet from '$lib/components/ConnectWallet.svelte';
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import Tooltip from '$lib/components/Tooltip.svelte';

  let hasBrowserWallet = $state(false);
  let expertMode = $state(false);
  
  onMount(() => {
    hasBrowserWallet = typeof (window as any).ethereum !== 'undefined';
  });
</script>

<div class="w-full flex flex-col min-h-screen max-w-xl gap-y-4 justify-center">
  <div class="w-full">
    <button onclick={() => history.back()}>
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </button>
  </div>
  <div class="flex items-center justify-between gap-x-2">
    <p class="font-bold text-xl">Access Circles</p>
    <div class="flex items-center gap-x-2 relative">
      <input
        type="checkbox"
        checked={expertMode}
        class="toggle toggle-sm"
        onchange={() => (expertMode = !expertMode)}
      />
      <span class="text-sm">Expert mode</span>
      <Tooltip content="Show advanced connection options" />
    </div>
  </div>

  <ConnectWallet
    imgUrl="/safe.png"
    header="Connect"
    desc={hasBrowserWallet
      ? 'Use Circles with Safe and MetaMask or any compatible browser wallet'
      : 'Not available'}
    route={hasBrowserWallet
      ? '/connect-wallet/connect-safe'
      : '/connect-wallet'}
    recommended="Connect"
  />

  {#if expertMode}
    <div class="w-full flex flex-col gap-y-4 mt-4" transition:slide={{ duration: 300 }}>
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
      <div class="flex items-center gap-x-2 mt-4">
        <input
          type="checkbox"
          checked={environment.ring}
          class="toggle toggle-sm checked:bg-orange-400 checked:text-orange-800"
          onchange={() => (environment.ring = !environment.ring)}
        />
        <a
          href="https://docs.aboutcircles.com/developer-docs/getting-started-with-the-sdk#using-the-sandbox-version-of-circles-sdk-for-builders" target="_blank"
          class={`flex font-semibold items-center text-sm text-nowrap  transition-color duration-300 ease-in-out ${
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
  {/if}
</div>
