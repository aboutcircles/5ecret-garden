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
    connect,
    getAccount,
    getConnectors,
    reconnect,
    type GetAccountReturnType,
  } from '@wagmi/core';
  import { config } from '../../../config';
  import type { Address } from '@circles-sdk/utils';
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

    account = getAccount(config);
    console.log(account);
    if (!account.chainId) {
      const connectorId = localStorage.getItem('connectorId');
      const connector = getConnectors(config).find((c) => c.id == connectorId);
      if (!connector) {
        throw new Error('Connector not found');
      }
      const result = await connect(config, {
        chainId: 100,
        connector: connector,
      });

      account = getAccount(config);
    }

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
  <ConnectSafe
    safeOwnerAddress={account.address as Address}
    chainId={100n}
    walletType="safe"
  />
{/if}
