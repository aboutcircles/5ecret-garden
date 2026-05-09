<script lang="ts">
  import { onMount } from 'svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import Lucide from '$lib/shared/ui/icons/Lucide.svelte';
  import { Check as LCheck } from 'lucide';
  import { T } from '$lib/design-system/tokens.js';

  let serviceAddress: `0x${string}` = $state('0x0');
  let mintHandlerAddress: `0x${string}` = $state('0x0');
  let redemptionHandlerAddress: `0x${string}` = $state('0x0');

  onMount(async () => {
    try {
      if (avatarState.avatar === undefined) return;
      serviceAddress = await avatarState.avatar?.service();
      mintHandlerAddress = await avatarState.avatar?.mintHandler();
      if (avatarState.groupType === 'CrcV2_CMGroupCreated')
        redemptionHandlerAddress = await avatarState.avatar?.redemptionHandler();
    } catch (error) {
      console.error('Error fetching contract data:', error);
    }
  });

  async function handleSetService() {
    try {
      await avatarState.avatar?.setService(serviceAddress);
    } catch (error) {
      console.error('Failed to set service address:', error);
    }
  }

  async function handleSetMintHandler() {
    try {
      await avatarState.avatar?.setMintHandler(mintHandlerAddress);
    } catch (error) {
      console.error('Failed to set mint handler address:', error);
    }
  }

  async function handleSetRedemptionHandler() {
    try {
      await avatarState.avatar?.setRedemptionHandler(redemptionHandlerAddress);
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

  {#if avatarState.groupType === 'CrcV2_CMGroupCreated'}
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
