<script lang="ts">
  import { goto } from '$app/navigation';
  import ActionButton from '$lib/components/ActionButton.svelte';
  import { ethers } from 'ethers6';
  import { avatar } from '$lib/stores/avatar';
  import { circles } from '$lib/stores/circles';
  import type { Avatar } from '@circles-sdk/sdk';
  import type { GroupProfile } from '@circles-sdk/profiles';
  import RegisterGroup from '$lib/pages/RegisterGroup.svelte';

  let mintPolicyAddress: string =
    $circles?.circlesConfig.baseGroupMintPolicy ?? '';
  $: mintPolicyAddressIsValid = ethers.isAddress(mintPolicyAddress);

  let profile: GroupProfile = {
    name: '',
    description: '',
    previewImageUrl: '',
    imageUrl: undefined,
    symbol: '',
  };

  async function registerGroup() {
    if (!$circles) {
      throw new Error('Wallet not connected ($circles is undefined)');
    }

    $avatar = <Avatar>(
      await $circles.registerGroupV2(mintPolicyAddress, profile)
    );

    await goto('/dashboard');
  }
</script>

<div
  class="w-full flex flex-col min-h-screen p-4 max-w-4xl gap-y-4 justify-center"
>
  <div class="w-full">
    <a href="/register">
      <img src="/arrow-left.svg" alt="Arrow Left" class="w-4 h-4" />
    </a>
  </div>
  <RegisterGroup />
  <!-- <div class="card bg-base-100 w-96 border shadow-sm">
    <figure class="px-10 pt-10">
      <img src="/group.svg" alt="group" class="w-16 h-16 rounded-xl" />
    </figure>
    <div class="card-body items-center text-center">
      <h2 class="card-title">Register group</h2>
      <div class="form-control">
        <label for="name" class="label">
          <span class="label-text">Name</span>
        </label>
        <input
          bind:value={profile.name}
          type="text"
          id="name"
          class="input input-bordered w-full"
          placeholder=""
        />
        <label for="symbol" class="label">
          <span class="label-text">Symbol</span>
        </label>
        <input
          bind:value={profile.symbol}
          type="text"
          id="symbol"
          class="input input-bordered w-full"
          placeholder="GRP"
        />
      </div>
      <details class="collapse">
        <summary class="collapse-title text-center">Advanced</summary>
        <div class="collapse-content">
          <div class="form-control">
            <label for="mintPolicyAddress" class="label">
              <span class="label-text">Mint policy address</span>
            </label>
            <input
              bind:value={mintPolicyAddress}
              type="text"
              id="mintPolicyAddress"
              class="input input-bordered w-full"
              placeholder="0x....."
            />
          </div>
        </div>
      </details>
      <div class="card-actions">
        <ActionButton
          action={registerGroup}
          disabled={!mintPolicyAddressIsValid ||
            profile.name.trim().length < 1 ||
            profile.symbol.trim().length < 1}
        >
          Create
        </ActionButton>
      </div>
    </div>
  </div> -->
</div>
