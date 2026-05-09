<script lang="ts">
  import { ethers } from 'ethers';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
  import { roundToDecimals } from '$lib/shared/utils/shared';
  import { executeTxSubmitFirst } from '$lib/shared/utils/txExecution';
  import { popupControls } from '$lib/shared/state/popup';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    asset: TokenBalanceRow;
  }

  let { asset }: Props = $props();

  let wrapType: 'Static' | 'Demurraged' = $state('Static');
  let amount: number = $state(0);
  let showAdvanced = $state(false);
  const canWrap = $derived(Number.isFinite(amount) && amount > 0);

  async function wrap() {
    const sendValue = ethers.parseEther(amount.toString());
    if (wrapType === 'Demurraged') {
      void executeTxSubmitFirst({
        name: `Wrap ${roundToDecimals(amount)} Circles as Demurraged ERC20...`,
        submit: () => wrapDemurraged(sendValue),
        onSubmitted: () => popupControls.close(),
      });
    } else {
      void executeTxSubmitFirst({
        name: `Wrap ${roundToDecimals(amount)} Circles as Inflationary ERC20...`,
        submit: () => wrapInflationary(sendValue),
        onSubmitted: () => popupControls.close(),
      });
    }
  }

  async function wrapInflationary(sendValue: bigint) {
    if (avatarState.avatar?.avatarInfo?.version !== 2) {
      throw new Error('Only supported for Avatar v2');
    }
    const receipt = await avatarState.avatar?.wrapInflationErc20(asset.tokenAddress, sendValue);
    if (!receipt) throw new Error('Failed to wrap Circles');
  }

  async function wrapDemurraged(sendValue: bigint) {
    if (avatarState.avatar?.avatarInfo?.version !== 2) {
      throw new Error('Only supported for Avatar v2');
    }
    const receipt = await avatarState.avatar?.wrapDemurrageErc20(asset.tokenAddress, sendValue);
    if (!receipt) throw new Error('Failed to wrap Circles');
  }

  const eyebrow = `font-size:10px;font-weight:600;color:${T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;margin:0 0 6px 2px;display:block;`;
  const inputStyle = `width:100%;padding:10px 14px;border:1px solid ${T.hairline};border-radius:10px;font-family:${T.fontSans};font-size:13px;color:${T.ink};background:${T.surface};box-sizing:border-box;`;
</script>

<div style="display:flex;flex-direction:column;gap:14px;padding:0 0 4px;">
  <div style="background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:14px;padding:10px 12px;">
    <span style={eyebrow}>Token</span>
    <BalanceRow item={asset} />
  </div>

  <div>
    <span style={eyebrow}>Amount</span>
    <input
      type="number"
      step="0.01"
      min="0"
      max={asset.circles}
      placeholder="0.00"
      style={inputStyle}
      bind:value={amount}
    />
    <div style="display:flex;justify-content:flex-end;margin-top:6px;">
      <button
        type="button"
        style="height:24px;padding:0 10px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{T.inkMuted};font-size:11px;cursor:pointer;"
        onclick={() => (amount = Number(asset.circles || 0))}
      >Use max</button>
    </div>
  </div>

  <p style="font-size:12px;color:{T.inkMuted};margin:0;line-height:1.5;">
    Wrapping creates a transferable token. You can unwrap anytime.
  </p>

  <!-- Advanced toggle -->
  <details style="background:{T.surfaceAlt};border:1px solid {T.hairlineSoft};border-radius:12px;overflow:hidden;">
    <summary style="padding:10px 14px;font-size:13px;font-weight:540;color:{T.ink};cursor:pointer;display:flex;align-items:center;justify-content:space-between;list-style:none;">
      <span>Advanced</span>
      <span style="font-size:11px;color:{T.inkMuted};">{showAdvanced ? 'Hide' : 'Show'}</span>
    </summary>
    <div style="padding:0 14px 14px;display:flex;flex-direction:column;gap:10px;" onmouseenter={() => (showAdvanced = true)}>
      <span style={eyebrow}>Type</span>
      <div style="display:flex;gap:16px;">
        <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:{T.ink};">
          <input type="radio" name="wrapType" value="Static" bind:group={wrapType} style="accent-color:{T.primary};" />
          Static
        </label>
        <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:{T.ink};">
          <input type="radio" name="wrapType" value="Demurraged" bind:group={wrapType} style="accent-color:{T.primary};" />
          Demurraged
        </label>
      </div>
    </div>
  </details>

  <div style="display:flex;justify-content:flex-end;margin-top:4px;">
    <button
      type="button"
      style="height:40px;padding:0 22px;border-radius:9999px;border:0;background:{canWrap ? T.primary : T.pageDeep};color:{canWrap ? '#fff' : T.inkMuted};font-size:13px;font-weight:580;cursor:{canWrap ? 'pointer' : 'not-allowed'};box-shadow:{canWrap ? '0 4px 12px rgba(88,73,212,0.25)' : 'none'};"
      onclick={wrap}
      disabled={!canWrap}
    >Wrap</button>
  </div>
</div>

<style>
  summary::-webkit-details-marker { display: none; }
</style>
