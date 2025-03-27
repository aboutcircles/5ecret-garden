<script lang="ts">
  import { goto } from '$app/navigation';
  import { wallet } from '$lib/stores/wallet';
  import { circles } from '$lib/stores/circles';
  import { Sdk, type AvatarRow } from '@circles-sdk/sdk';
  import { gnosisConfig } from '$lib/chiadoConfig';
  import { PrivateKeyContractRunner } from '@circles-sdk/adapter-ethers';
  import SeedphraseInput from '$lib/components/SeedphraseInput.svelte';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';
  import CreateSafe from '$lib/pages/CreateSafe.svelte';
  import { ethers } from 'ethers';
  import type { Address } from '@circles-sdk/utils';
  import { onMount } from 'svelte';

  let mnemonicPhrase: string = $state('');
  let hasValidKey = $state(false);
  let privateKey = $state('');
  let address = $state('');
  let safes: Address[] = $state([]);
  let profileBySafe: Record<string, AvatarRow | undefined> = $state({});

  const provider = new ethers.JsonRpcProvider(gnosisConfig.circlesRpcUrl);

  const getSafesByOwnerApiEndpoint = (checksumOwnerAddress: string): string =>
    `https://safe-transaction-gnosis-chain.safe.global/api/v1/owners/${checksumOwnerAddress}/safes/`;

  async function querySafeTransactionService(
    ownerAddress: string
  ): Promise<Address[]> {
    const checksumAddress = ethers.getAddress(ownerAddress);
    const requestUrl = getSafesByOwnerApiEndpoint(checksumAddress);

    const safesByOwnerResult = await fetch(requestUrl);
    const safesByOwner = await safesByOwnerResult.json();

    return safesByOwner.safes ?? [];
  }

  async function loadSafesAndProfile() {
    if (!$wallet?.address) {
      throw new Error('Wallet address is not available');
    }

    safes = await querySafeTransactionService($wallet.address);
    const profileFetchPromises = safes.map(async (safe) => {
      if (!$circles || !$wallet?.address) {
        throw new Error('Circles SDK or wallet not initialized');
      }
      const avatarInfo = await $circles.data.getAvatarInfo(safe);
      profileBySafe = { ...profileBySafe, [safe]: avatarInfo };
    });

    await Promise.all(profileFetchPromises);
  }

  async function connectWallet() {
    if (!hasValidKey || address === '') {
      return;
    }

    const walletRunner = new PrivateKeyContractRunner(provider, privateKey);
    await walletRunner.init();

    localStorage.setItem('privateKey', privateKey);

    $wallet = walletRunner;
    const network = await $wallet.provider?.getNetwork();

    $circles = new Sdk($wallet!, gnosisConfig);

    try {
      const request = await fetch(
        `https://static.174.163.76.144.clients.your-server.de/faucet/fund-me/${address}`
      );
      const response = await request.text();
    } catch (e) {
      console.error(`Couldn't fund address ${address}`, e);
    }

    await loadSafesAndProfile();
  }

  async function onsafecreated(address: Address) {
    const newSafeAddress = address;
    safes = [...safes, newSafeAddress];
  }

  onMount(async () => {
    localStorage.removeItem('useMM');
    localStorage.setItem('usePK', 'true');

    if (localStorage.getItem('privateKey')) {
      privateKey = localStorage.getItem('privateKey')!;
      const walletRunner = new PrivateKeyContractRunner(provider, privateKey);
      await walletRunner.init();

      $wallet = walletRunner;
      $circles = new Sdk($wallet!, gnosisConfig);

      await loadSafesAndProfile();
    }
  });
</script>

<div
  class="w-full flex flex-col items-center min-h-screen p-4 max-w-5xl gap-y-8 mt-20"
>
  {#if !$wallet?.address}
    <h2 class="font-bold text-[28px] md:text-[32px]">
      Import circles.garden keyphrase
    </h2>
    <p class="font-normal text-black/60 text-base">
      Please enter or paste your keyphrase from circles.garden below.
    </p>
    <SeedphraseInput
      bind:isValidMnemonic={hasValidKey}
      bind:privateKey
      bind:mnemonicPhrase
      bind:address
    />
    <button
      on:click={connectWallet}
      class="btn btn-sm"
      class:btn-disabled={!hasValidKey}>Import</button
    >
  {:else}
    {#each safes ?? [] as item (item)}
      <ConnectCircles
        address={item}
        walletType="safe"
        isRegistered={profileBySafe[item] !== undefined}
        chainId={network.chainId}
      />
    {/each}

    <div class="text-center">
      <CreateSafe {onsafecreated} />
    </div>
  {/if}
</div>
