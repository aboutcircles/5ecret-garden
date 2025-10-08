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
  <img src="./illustration.png" alt="illustration" class="max-w-[340px]" />
  <h1 class="text-5xl font-bold">Fair Money For All</h1>
  <p class="py-6 px-2">
    Mint personal Circles, build trust, and manage your community groups with the Circles Core app
  </p>
  <ActionButton action={connectWallet}>Get started</ActionButton>
</div>
