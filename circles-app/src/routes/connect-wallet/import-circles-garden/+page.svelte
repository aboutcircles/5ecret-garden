<script lang="ts">
  import { onMount } from 'svelte';
  import { Sdk, type AvatarRow } from '@circles-sdk/sdk';
  import { circles } from '$lib/stores/circles';
  import { wallet } from '$lib/stores/wallet';
  import { PrivateKeyContractRunner } from '@circles-sdk/adapter-ethers';
  import { getCirclesConfig } from '$lib/utils/helpers';
  import { gnosisConfig } from '$lib/chiadoConfig';
  import SeedphraseInput from '$lib/components/SeedphraseInput.svelte';
  import ConnectCircles from '$lib/components/ConnectCircles.svelte';
  import CreateSafe from '$lib/pages/CreateSafe.svelte';
  import WalletLoader from '$lib/components/WalletLoader.svelte';
  import { avatar } from '$lib/stores/avatar';
  import type { Address } from '@circles-sdk/utils';
  import { ethers, type Network } from 'ethers';

  let mnemonicPhrase: string = $state('');
  let hasValidKey = $state(false);
  let privateKey = $state('');
  let address = $state('');
  let network: Network | undefined = $state();
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

  async function setup() {
    try {
      const request = await fetch(
        `https://static.174.163.76.144.clients.your-server.de/faucet/fund-me/${address}`
      );
      await request.text();
    } catch (e) {
      console.error(`Couldn't fund address ${address}`, e);
    }

    const walletRunner = new PrivateKeyContractRunner(provider, privateKey);
    await walletRunner.init();

    $wallet = walletRunner;

    network = await $wallet.provider?.getNetwork();

    if (!network) {
      throw new Error('Failed to get network');
    }
    const circlesConfig = await getCirclesConfig(network.chainId);

    $circles = new Sdk($wallet!, circlesConfig);
    await loadSafesAndProfile();
  }

  async function connectWallet() {
    await setup();
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
      await setup();
    }
  });
</script>

<div
  class="w-full flex flex-col items-center min-h-screen p-4 max-w-xl gap-y-4 mt-20"
>
  <div class="w-full">
    <a href={$avatar ? '/dashboard' : '/connect-wallet'}>
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </a>
  </div>

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
  {:else if $wallet?.address && $circles && network}
    <h2 class="font-bold text-[28px] md:text-[32px]">Select Avatar</h2>
    <p class="font-normal text-black/60 text-base">
      Please select the avatar you want to use from the list below.
    </p>

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
  {:else}
    <WalletLoader name="Safe" />
  {/if}
</div>
