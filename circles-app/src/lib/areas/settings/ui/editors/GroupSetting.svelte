<script lang="ts">
  import { onMount } from 'svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { Check as LCheck } from 'lucide';

  let serviceAddress: `0x${string}` = $state('0x0');
  let mintHandlerAddress: `0x${string}` = $state('0x0');
  let redemptionHandlerAddress: `0x${string}` = $state('0x0');

  onMount(async () => {
    try {
      if (avatarState.avatar === undefined) return;

      // New SDK: group methods are in .properties / .setProperties namespaces
      const groupAvatar = avatarState.avatar as any;
      if (groupAvatar?.properties?.service) {
        serviceAddress = await groupAvatar.properties.service();
      }
      if (groupAvatar?.properties?.mintHandler) {
        mintHandlerAddress = await groupAvatar.properties.mintHandler();
      }
      // redemptionHandler may not exist in all group types -- check avatar registration type
      const isCmGroup = (avatarState.avatar as any)?.avatarInfo?.type === 'CrcV2_CMGroupCreated';
      if (isCmGroup && groupAvatar?.properties?.redemptionHandler) {
        redemptionHandlerAddress = await groupAvatar.properties.redemptionHandler();
      }
    } catch (error) {
      console.error('Error fetching contract data:', error);
    }
  });

  async function handleSetService() {
    try {
      const groupAvatar = avatarState.avatar as any;
      await groupAvatar?.setProperties?.service(serviceAddress);
    } catch (error) {
      console.error('Failed to set service address:', error);
    }
  }

  async function handleSetMintHandler() {
    try {
      // mintHandler setter may not be available in new SDK -- fall back gracefully
      const groupAvatar = avatarState.avatar as any;
      if (groupAvatar?.setProperties?.mintHandler) {
        await groupAvatar.setProperties.mintHandler(mintHandlerAddress);
      } else {
        console.warn('setMintHandler not available in current SDK');
      }
    } catch (error) {
      console.error('Failed to set mint handler address:', error);
    }
  }

  async function handleSetRedemptionHandler() {
    try {
      const groupAvatar = avatarState.avatar as any;
      if (groupAvatar?.setProperties?.redemptionHandler) {
        await groupAvatar.setProperties.redemptionHandler(redemptionHandlerAddress);
      } else {
        console.warn('setRedemptionHandler not available in current SDK');
      }
    } catch (error) {
      console.error('Failed to set redemption handler address:', error);
    }
  }
</script>

<div class="space-y-4">
  <label class="form-control">
    <span class="label-text">Service address</span>
    <div class="join">
      <input id="circlesAddress" type="text" class="input input-bordered join-item w-full" bind:value={serviceAddress} placeholder="0x…" />
      <button type="button" class="btn btn-primary join-item btn-xs" onclick={handleSetService}>
        <Lucide icon={LCheck} size={16} class="shrink-0" ariaLabel="" />
      </button>
    </div>
  </label>

  <label class="form-control">
    <span class="label-text">Mint handler address</span>
    <div class="join">
      <input id="tokenAddress" type="text" class="input input-bordered join-item w-full" bind:value={mintHandlerAddress} placeholder="0x…" />
      <button type="button" class="btn btn-primary join-item btn-xs" onclick={handleSetMintHandler}>
        <Lucide icon={LCheck} size={16} class="shrink-0" ariaLabel="" />
      </button>
    </div>
  </label>

  {#if (avatarState.avatar as any)?.avatarInfo?.type === 'CrcV2_CMGroupCreated'}
    <label class="form-control">
      <span class="label-text">Redemption handler address</span>
      <div class="join">
        <input id="redemption" type="text" class="input input-bordered join-item w-full" bind:value={redemptionHandlerAddress} placeholder="0x…" />
        <button type="button" class="btn btn-primary join-item btn-xs" onclick={handleSetRedemptionHandler}>
          <Lucide icon={LCheck} size={16} class="shrink-0" ariaLabel="" />
        </button>
      </div>
    </label>
  {/if}
</div>
