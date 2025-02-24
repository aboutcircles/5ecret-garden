<script lang="ts">
  import type { GroupProfile } from '@circles-sdk/profiles';
  import { createEventDispatcher } from 'svelte';
  import { isValidName, isValidSymbol } from '$lib/utils/isValid';
  import MintPolicy from './MintPolicy.svelte';
  import { mintPolicies } from '$lib/utils/mintPolicy';
  import Tooltip from './Tooltip.svelte';
  import { circles } from '$lib/stores/circles';
  import { avatar } from '$lib/stores/avatar';
  import type { Avatar } from '@circles-sdk/sdk';
  import ImageUpload from './ImageUpload.svelte';
  import { cidV0ToUint8Array } from '@circles-sdk/utils';
  import { CMGContract } from '$lib/stores/contract';

  interface CMGProfile {
    service: string;
    initialConditions: string;
  }

  let groupProfile: GroupProfile = {
    name: '',
    symbol: '',
    description: '',
    previewImageUrl: '',
    imageUrl: '',
  };

  let isLoading = false;
  let formData: CMGProfile = {
    service: '0x0000000000000000000000000000000000000000',
    initialConditions: '',
  };
  let mintPolicy = mintPolicies[0];

  const dispatch = createEventDispatcher();

  $: validName =
    isValidName(groupProfile.name) || groupProfile.name.length === 0;
  $: validSymbol =
    isValidSymbol(groupProfile.symbol) || groupProfile.symbol.length === 0;

  async function handleSubmit() {
    if (!validName || !validSymbol) return;
    isLoading = true;

    if (!$circles) {
      throw new Error('Wallet not connected ($circles is undefined)');
    }
    // $avatar = <Avatar>(
    //   await $circles.registerGroupV2(mintPolicy.address, formData)
    // );

    const CID = await $circles.profiles?.create(groupProfile);

    if (!CID) {
      throw new Error('Failed to create profile CID');
    }

    if (!$CMGContract) {
      throw new Error('$CMGContract is null');
    }

    let initialConditions: string[] = [];
    if (formData.initialConditions.length > 0) {
      initialConditions = formData.initialConditions
        .split(',')
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0);
    }

    const tx = await $CMGContract.createCMGroup(
      formData.service,
      initialConditions,
      groupProfile.name,
      groupProfile.symbol,
      cidV0ToUint8Array(CID)
    );

    // if ($avatar) {
    dispatch('stepChange', 'executed');
    // } else {
    //   dispatch('stepChange', 'error');
    // }
  }

  const onNewImage = (e: any) => {
    groupProfile.previewImageUrl = e.detail.dataUrl;
  };

  const onImageCleared = (e: any) => {
    groupProfile.previewImageUrl = '';
  };
</script>

<form
  on:submit|preventDefault={handleSubmit}
  class="w-full h-full flex flex-col gap-2 items-center justify-center text-xs md:text-sm/6 text-black"
>
  <div class="w-full flex justify-between">
    <div></div>
    <h1 class="text-2xl text-center font-bold text-primary mb-2">
      CREATE GROUP
    </h1>
    <div class="dropdown dropdown-end">
      <div tabIndex={0} role="button" class="btn btn-ghost btn-circle btn-xs">
        <img src="/setting.svg" alt="setting" class="w-5 h-5 inline" />
      </div>
      <div
        tabIndex={0}
        class="dropdown-content bg-base-100 rounded-box z-[1] w-96 p-2 shadow"
      >
        <div class="label">
          <span class="label-text"
            >Service
            <Tooltip content="Enter a service for your group." />
          </span>
        </div>
        <input
          required
          type="text"
          name="service"
          class="input input-sm input-bordered w-full"
          bind:value={formData.service}
        />
        <div class="label">
          <span class="label-text"
            >Initial Conditions
            <Tooltip content="Enter the initial conditions for your group." />
          </span>
        </div>
        <input
          type="text"
          name="initialConditions"
          class="input input-sm input-bordered w-full"
          bind:value={formData.initialConditions}
        />
      </div>
    </div>
  </div>
  <div class="flex flex-col-reverse gap-2 md:flex-row w-full gap-x-2">
    <div class="flex flex-col w-full h-full justify-center md:w-2/3">
      <div class="w-full">
        <div class="label">
          <span class="label-text"
            >Name
            <Tooltip content="Enter a name for your group." />
          </span>
        </div>
        <input
          required
          type="text"
          name="name"
          placeholder="Group Name..."
          class="input input-sm input-bordered w-full md:max-w-xs"
          bind:value={groupProfile.name}
        />
        <p class="text-xs text-error h-4 pl-1">
          {#if !validName}
            Invalid name
          {/if}
        </p>
      </div>
      <div class="w-full">
        <div class="label">
          <span class="label-text"
            >Symbol
            <Tooltip content="Add a short currency symbol (e.g., CRC)." /></span
          >
        </div>
        <input
          required
          type="text"
          name="symbol"
          placeholder="CRC..."
          class="input input-sm input-bordered w-full md:max-w-xs"
          bind:value={groupProfile.symbol}
        />
        <p class="text-xs text-error h-4 pl-1">
          {#if !validSymbol}
            Invalid symbol
          {/if}
        </p>
      </div>
    </div>
    <div class="w-full md:w-1/3 flex flex-col items-center">
      <div class="label font-bold mb-1 flex items-center gap-1">
        Group Image
        <Tooltip
          content="Upload a logo or image for your group. Max size=2MB, 150x150 pixels."
        />
      </div>
      <ImageUpload
        imageDataUrl={groupProfile.previewImageUrl}
        cropHeight={256}
        cropWidth={256}
        on:newImage={onNewImage}
        on:cleared={onImageCleared}
      />
    </div>
  </div>
  <div class="w-full mb-8">
    <div class="label">
      <span class="label-text"
        >Description
        <Tooltip content="Provide a brief description of your group." />
      </span>
    </div>
    <textarea
      name="description"
      placeholder="Group Description..."
      class="textarea textarea-bordered w-full"
      bind:value={groupProfile.description}
    />
  </div>
  <div class="w-full flex flex-col mb-12 pt-8 border-t-1.5">
    <div class="label">
      <span class="label-text"
        >Base Mint Policy
        <Tooltip content="Select the minting policy for group currency." />
      </span>
    </div>
    <a
      class="flex mb-2 items-center font-bold text-xs text-primary"
      href={'https://docs.aboutcircles.com/overview/circles-architecture'}
      target="_blank"
    >
      Learn more
      <img src="/external.svg" alt="external icon" class="h-3 w-3 ml-1" />
    </a>
    <MintPolicy {mintPolicy} on:update={(e) => (mintPolicy = e.detail)} />
  </div>
  <button
    type="submit"
    disabled={!validName || !validSymbol}
    class="btn btn-sm btn-primary"
  >
    {#if isLoading}
      <span class="loading loading-spinner"></span>
      loading
    {:else}
      Register
    {/if}
  </button>
</form>
