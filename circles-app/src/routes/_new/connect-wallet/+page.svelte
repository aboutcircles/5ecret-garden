<script lang="ts">
  import ConnectWallet from '$lib/components/ConnectWallet.svelte';
  import { onMount } from 'svelte';

  let hasBrowserWallet = false;
  onMount(() => {
    hasBrowserWallet = typeof (<any>window).ethereum !== 'undefined';
  });
</script>

<div
  class="w-full flex flex-col min-h-screen p-4 max-w-xl gap-y-4 mt-20"
>
  <p class="font-bold text-xl">Access Circles</p>
  <ConnectWallet
    imgUrl="/logo.svg"
    header="circles.garden"
    desc="Use your circles.garden key in 5ecret-garden"
    route="/_new/connect-wallet/import-circles-garden"
  />
  <ConnectWallet
    imgUrl="/fox.png"
    header="Use MetaMask"
    desc={hasBrowserWallet
      ? 'Use Circles with MetaMask or any compatible browser wallet'
      : 'Not available'}
    route={hasBrowserWallet
      ? '/_new/connect-wallet/connect-metamask'
      : '/_new/connect-wallet'}
  />
  <ConnectWallet
    imgUrl="/safe.svg"
    header="Use Safe"
    desc={hasBrowserWallet
      ? 'Use Circles with Safe and MetaMask or any compatible browser wallet'
      : 'Not available'}
    route={hasBrowserWallet
      ? '/_new/connect-wallet/connect-safe'
      : '/_new/connect-wallet'}
  />
  <p class="font-bold text-xl mt-4">Testnet only options</p>
  <ConnectWallet
    imgUrl="/cometh-logo.svg"
    header="Use Cometh"
    desc="Use Circles with a Passkey that's stored on your device"
    route="/_new/connect-wallet/connect-cometh"
  />
</div>
