<script lang="ts">
  import ConnectWallet from '$lib/components/ConnectWallet.svelte';
  import { onMount } from 'svelte';

  let hasBrowserWallet = false;
  onMount(() => {
    hasBrowserWallet = typeof (<any>window).ethereum !== 'undefined';
  });
</script>

<div
  class="w-full flex flex-col min-h-screen p-4 max-w-xl gap-y-4 justify-center"
>
  <div class="w-full">
    <a href="/">
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </a>
  </div>
  <p class="font-bold text-xl">Access Circles</p>
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
  <p class="font-bold text-xl mt-4">Available on Testnet only</p>
  <ConnectWallet
    imgUrl="/cometh-logo.svg"
    header="Use Cometh"
    desc="Use Circles with a Passkey that's stored on your device"
    route="/connect-wallet/connect-cometh"
  />
</div>
