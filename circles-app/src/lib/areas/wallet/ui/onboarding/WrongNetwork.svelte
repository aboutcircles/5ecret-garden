<script lang="ts">
  import { switchChain } from '@wagmi/core';
  import { config } from '../../../../../config';
  import { popupControls } from '$lib/shared/state/popup';
  import { T } from '$lib/design-system/tokens.js';
  import Icon from '$lib/design-system/Icon.svelte';

  let isSwitching = $state(false);
  let switchError = $state<string | null>(null);

  async function switchToGnosis(): Promise<void> {
    if (isSwitching) return;
    isSwitching = true;
    switchError = null;
    try {
      await switchChain(config, { chainId: 100 });
      popupControls.close();
    } catch (e: any) {
      switchError = String(e?.shortMessage ?? e?.message ?? e ?? 'Failed to switch network');
    } finally {
      isSwitching = false;
    }
  }
</script>

<div style="display:flex;flex-direction:column;gap:14px;">
  <!-- Hero -->
  <div style="
    border-radius:18px;padding:24px 20px;
    background:linear-gradient(160deg,{T.warningSoft} 0%,{T.coralSoft} 100%);
    display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;
  ">
    <div style="
      width:56px;height:56px;border-radius:18px;
      background:rgba(255,255,255,0.7);
      display:inline-flex;align-items:center;justify-content:center;
    ">
      <Icon name="info" size={26} stroke={T.warning} strokeWidth={2} />
    </div>
    <span style="font-family:{T.fontDisplay};font-size:24px;color:{T.ink};letter-spacing:-0.02em;line-height:1.15;margin-top:4px;">
      Wrong network
    </span>
    <span style="font-size:13px;color:{T.inkBody};line-height:1.5;max-width:320px;">
      Circles runs on <b>Gnosis Chain</b>. Switch your wallet to continue.
    </span>
  </div>

  {#if switchError}
    <div style="
      padding:12px 14px;border-radius:12px;
      background:{T.negativeSoft};border:1px solid rgba(196,68,48,0.18);
      display:flex;align-items:flex-start;gap:8px;
    ">
      <Icon name="info" size={13} stroke={T.negative} strokeWidth={2} style="flex-shrink:0;margin-top:2px;" />
      <span style="font-size:12.5px;color:{T.negative};line-height:1.45;">{switchError}</span>
    </div>
  {/if}

  <!-- CTA -->
  <button
    type="button"
    onclick={switchToGnosis}
    disabled={isSwitching}
    data-popup-default-action
    data-popup-initial-focus
    style="
      width:100%;height:48px;border-radius:9999px;border:0;cursor:pointer;
      background:{T.primary};color:#fff;
      display:inline-flex;align-items:center;justify-content:center;gap:8px;
      font-family:{T.fontSans};font-size:14.5px;font-weight:580;letter-spacing:-0.005em;
      box-shadow:0 6px 18px rgba(88,73,212,0.32),0 1px 0 rgba(255,255,255,0.18) inset;
      opacity:{isSwitching ? 0.7 : 1};
    "
  >
    {#if isSwitching}
      <span class="loading loading-spinner loading-sm"></span>
      Switching…
    {:else}
      Switch to Gnosis Chain
    {/if}
  </button>

  <span style="font-size:11px;color:{T.inkSubtle};text-align:center;margin-top:-4px;">
    Chain ID 100 · xDAI
  </span>
</div>
