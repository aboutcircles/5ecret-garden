<script lang="ts">
  import { onMount } from 'svelte';
  import type { Address } from '@aboutcircles/sdk-types';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { BaseGroupAvatar } from '@aboutcircles/sdk';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { Check as LCheck } from 'lucide';
  import { T } from '$lib/design-system/tokens.js';

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

  const eyebrow = `font-size:10px;font-weight:600;color:${T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;margin:0 0 6px 2px;display:block;`;
  const inputStyle = `flex:1;min-width:0;padding:10px 14px;border:1px solid ${T.hairline};border-radius:10px 0 0 10px;font-family:${T.fontMono};font-size:11.5px;color:${T.ink};background:${T.surface};box-sizing:border-box;`;
  const saveBtn = `height:40px;padding:0 14px;border-radius:0 10px 10px 0;border:1px solid ${T.hairline};border-left:0;background:${T.surfaceAlt};color:${T.ink};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;`;
</script>

<div style="display:flex;flex-direction:column;gap:16px;">
  <div>
    <span style={eyebrow}>Service address</span>
    <div style="display:flex;">
      <input type="text" style={inputStyle} bind:value={serviceAddress} placeholder="0x…" />
      <button type="button" style={saveBtn} onclick={handleSetService} aria-label="Set service address">
        <Lucide icon={LCheck} size={15} ariaLabel="" />
      </button>
    </div>
  </div>

  <div>
    <span style={eyebrow}>Mint handler address</span>
    <div style="display:flex;">
      <input type="text" style={inputStyle} bind:value={mintHandlerAddress} placeholder="0x…" />
      <button type="button" style={saveBtn} onclick={handleSetMintHandler} aria-label="Set mint handler">
        <Lucide icon={LCheck} size={15} ariaLabel="" />
      </button>
    </div>
  </div>

  {#if isBaseGroupAvatar(avatarState.avatar) && isCmGroupType(avatarState.avatar)}
    <div>
      <span style={eyebrow}>Redemption handler address</span>
      <div style="display:flex;">
        <input type="text" style={inputStyle} bind:value={redemptionHandlerAddress} placeholder="0x…" />
        <button type="button" style={saveBtn} onclick={handleSetRedemptionHandler} aria-label="Set redemption handler">
          <Lucide icon={LCheck} size={15} ariaLabel="" />
        </button>
      </div>
    </div>
  {/if}
</div>
