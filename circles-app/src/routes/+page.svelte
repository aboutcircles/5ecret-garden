<script lang="ts">
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { goto } from '$app/navigation';

  async function connectWallet() {
    goto('/connect-wallet');
  }
</script>

<div
  class="min-h-screen flex flex-col items-center justify-center max-w-md text-center"
>
  <img src="./illustration.png" alt="illustration" />
  <h1 class="text-5xl font-bold">Fair Money For All</h1>
  <p class="py-6 px-2">
    Circles is an unconditional, universal and unique system that consists of
    individual personal currencies that function together to create a unified
    monetary system. Tying the currency to time, Circles allows for a new way of
    valuing labour, skill and contribution.
  </p>
  <ActionButton action={connectWallet}>Get started</ActionButton>
</div>
