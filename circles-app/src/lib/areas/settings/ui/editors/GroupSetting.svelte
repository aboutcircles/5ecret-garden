<script lang="ts">
  import { onMount } from 'svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { BaseGroupAvatar } from '@aboutcircles/sdk';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { Check as LCheck } from 'lucide';

  let serviceAddress: Address = $state('0x0' as Address);
  let mintHandlerAddress: Address = $state('0x0' as Address);
  let redemptionHandlerAddress: Address = $state('0x0' as Address);

  /** Type guard: narrows avatar to BaseGroupAvatar which has .properties and .setProperties */
  function isBaseGroupAvatar(avatar: unknown): avatar is BaseGroupAvatar {
    return avatar instanceof BaseGroupAvatar;
  }

  /** Check if the avatar was registered as a CM group (type string not in AvatarType union) */
  function isCmGroupType(avatar: BaseGroupAvatar): boolean {
    return (avatar.avatarInfo?.type as string) === 'CrcV2_CMGroupCreated';
  }

  onMount(async () => {
    try {
      if (avatarState.avatar === undefined) return;
      if (!isBaseGroupAvatar(avatarState.avatar)) return;

      const groupAvatar = avatarState.avatar;
      serviceAddress = await groupAvatar.properties.service();
      mintHandlerAddress = await groupAvatar.properties.mintHandler();

      // redemptionHandler may not exist in all group types -- check avatar registration type
      if (isCmGroupType(groupAvatar)) {
        // BaseGroupAvatar type declarations don't include redemptionHandler (CM-group-specific);
        // access it dynamically as an extension property.
        const props = groupAvatar.properties as typeof groupAvatar.properties & {
          redemptionHandler?: () => Promise<Address>;
        };
        if (props.redemptionHandler) {
          redemptionHandlerAddress = await props.redemptionHandler();
        }
      }
    } catch (error) {
      console.error('Error fetching contract data:', error);
    }
  });

  async function handleSetService() {
    try {
      if (!isBaseGroupAvatar(avatarState.avatar)) return;
      await avatarState.avatar.setProperties.service(serviceAddress);
    } catch (error) {
      console.error('Failed to set service address:', error);
    }
  }

  async function handleSetMintHandler() {
    try {
      if (!isBaseGroupAvatar(avatarState.avatar)) return;
      // BaseGroupAvatar.setProperties doesn't include mintHandler -- fall back gracefully
      const setProps = avatarState.avatar.setProperties as typeof avatarState.avatar.setProperties & {
        mintHandler?: (addr: Address) => Promise<unknown>;
      };
      if (setProps.mintHandler) {
        await setProps.mintHandler(mintHandlerAddress);
      } else {
        console.warn('setMintHandler not available in current SDK');
      }
    } catch (error) {
      console.error('Failed to set mint handler address:', error);
    }
  }

  async function handleSetRedemptionHandler() {
    try {
      if (!isBaseGroupAvatar(avatarState.avatar)) return;
      // redemptionHandler setter is CM-group-specific, not in base type declarations
      const setProps = avatarState.avatar.setProperties as typeof avatarState.avatar.setProperties & {
        redemptionHandler?: (addr: Address) => Promise<unknown>;
      };
      if (setProps.redemptionHandler) {
        await setProps.redemptionHandler(redemptionHandlerAddress);
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

  {#if isBaseGroupAvatar(avatarState.avatar) && isCmGroupType(avatarState.avatar)}
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
