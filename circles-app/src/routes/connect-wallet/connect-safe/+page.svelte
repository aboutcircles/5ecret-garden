<script lang="ts">
  import ConnectSafe from '$lib/components/ConnectSafe.svelte';
  import { initializeWallet, wallet } from '$lib/stores/wallet.svelte';
  import { circles } from '$lib/stores/circles';
  import { onMount } from 'svelte';
  import { getCirclesConfig } from '$lib/utils/helpers.js';
  import { Sdk } from '@circles-sdk/sdk';
  import { CirclesStorage } from '$lib/utils/storage';
  import { environment } from '$lib/stores/environment.svelte';
  import {
    getAccount,
    getConnectors,
    reconnect,
    type GetAccountReturnType,
  } from '@wagmi/core';
  import { config } from '../../../config';
  import type { Address } from '@circles-sdk/utils';
  import { shortenAddress } from '$lib/utils/shared';
  let initialized: boolean | undefined = $state();

  let account: GetAccountReturnType | undefined = $state();

  async function setup(callNo = 0) {
    // if (CirclesStorage.getInstance().walletType != 'safe') {
    //   CirclesStorage.getInstance().data = {
    //     avatar: undefined,
    //     group: undefined,
    //   };
    // }
    // $wallet = await initializeWallet('safe');

    const connectorId = localStorage.getItem('connectorId');
    const connector = getConnectors(config).find((c) => c.id == connectorId);
    if (!connector) {
      throw new Error('Connector not found');
    }
    await reconnect(config, {
      connectors: [connector],
    });

    account = getAccount(config);

    if (callNo > 2) {
      return;
    }

    if (!account.chainId) {
      throw new Error('Failed to get chainId');
    }

    // Initialize the Circles SDK and set it as $circles to make it globally available.
    const circlesConfig = await getCirclesConfig(
      BigInt(account.chainId),
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

{#if !initialized || !account}
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
        <option disabled={true}>Safe signer {shortenAddress(account.address)}</option>
        <option>import circles.garden keyphrase</option>
        <option>use without safe</option>
      </select>
    </div>
    <ConnectSafe
      safeOwnerAddress={account.address as Address}
      chainId={100n}
      walletType="safe"
    />
  </div>
{/if}
