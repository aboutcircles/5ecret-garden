<script lang="ts">
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';
  import { initializeWallet, signer, wallet } from '$lib/stores/wallet.svelte';
  import { circles } from '$lib/stores/circles';
  import { onMount } from 'svelte';
  import { getCirclesConfig } from '$lib/utils/helpers.js';
  import { Sdk } from '@circles-sdk/sdk';
  import { CirclesStorage } from '$lib/utils/storage';
  import { environment } from '$lib/stores/environment.svelte';
  import type { Address } from '@circles-sdk/utils';
  import { shortenAddress } from '$lib/utils/shared';
  let initialized: boolean | undefined = $state();

  async function setup() {
    // Initialize the Circles SDK and set it as $circles to make it globally available.
    const circlesConfig = await getCirclesConfig(
      BigInt(100),
      environment.ring
    );
    $wallet = await initializeWallet('safe');
    $circles = new Sdk($wallet!, circlesConfig);

    CirclesStorage.getInstance().data = {
      walletType: 'safe',
    };
  }

  onMount(async () => {
    $wallet = undefined;
    await setup();
    initialized = true;
  });
</script>

{#if !initialized || !signer.address}
  Loading...
{:else}
  <div
    class="w-full flex flex-col items-center min-h-screen max-w-xl gap-y-4 mt-20"
  >
    <div class="w-full">
      <button onclick={() => history.back()}>
        <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
      </button>
    </div>
    <h2 class="font-bold text-[28px] md:text-[32px]">Select Account</h2>
    <p class="font-normal text-black/60 text-base">
      Please select the account you want to use from the list below.
    </p>
    <div class="flex w-full justify-end">
      <select class="select select-sm select-bordered">
        <option>Signer {shortenAddress(signer.address)}</option>
        <option class="text-warning">use EOA</option>
      </select>
    </div>
    <ConnectSafe
      safeOwnerAddress={signer.address as Address}
      chainId={100n}
      walletType="safe"
    />
  </div>
{/if}
