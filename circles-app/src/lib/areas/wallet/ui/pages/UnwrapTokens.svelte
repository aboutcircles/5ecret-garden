<script lang="ts">
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { ethers } from 'ethers';
  import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
  import type { TokenBalance } from '@aboutcircles/sdk-types';
  import { roundToDecimals } from '$lib/shared/utils/shared';
  import { executeTxSubmitFirst } from '$lib/shared/utils/txExecution';
  import { popupControls } from '$lib/shared/state/popup';
  import { wallet } from '$lib/shared/state/wallet.svelte';
  import { get } from 'svelte/store';
  import { sendRunnerTransactionAndWait } from '$lib/shared/utils/tx';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    asset: TokenBalance;
  }

  let { asset }: Props = $props();

  let amount: number = $state(0);
  const maxUnwrapAmount = $derived(asset.isWrapped ? asset.staticCircles : asset.circles);
  const canUseMax = $derived(
    Number.isFinite(Number(maxUnwrapAmount)) && Number(maxUnwrapAmount) > 0
  );
  const canUnwrap = $derived(Number.isFinite(amount) && amount > 0);

  async function unwrapViaRunner(tokenAddress: string, amountWei: bigint): Promise<void> {
    const runner = get(wallet) as any;
    const wrapperInterface = new ethers.Interface(['function unwrap(uint256 amount)']);
    const data = wrapperInterface.encodeFunctionData('unwrap', [amountWei]);
    await sendRunnerTransactionAndWait(runner, {
      to: tokenAddress,
      value: 0n,
      data,
    }, { label: 'Unwrap transaction' });
  }

  async function unwrap() {
    if (!avatarState.avatar) {
      throw new Error('Avatar not loaded');
    }

    const amountWei = BigInt(ethers.parseEther(amount.toString()));

    // Flag-based detection beats the brittle tokenType string match: the
    // indexer reports group-wrapper variants (gCRC) with tokenType strings
    // that don't carry the `_Inflationary` / `_Demurraged` suffix, but the
    // SDK always sets `isWrapped` + `isInflationary` consistently. Branching
    // on flags makes this popup work for personal AND group wrappers.
    const isInflationary = asset.isWrapped === true && asset.isInflationary === true;
    const isDemurraged = asset.isWrapped === true && asset.isInflationary === false;

    if (!isInflationary && !isDemurraged) {
      throw new Error(
        `Unsupported token type: ${asset.tokenType ?? 'unknown'} (isWrapped=${asset.isWrapped}, isInflationary=${asset.isInflationary})`
      );
    }

    void executeTxSubmitFirst({
      name: `Unwrap ${roundToDecimals(amount)} ${isInflationary ? 'static ' : ''}tokens ...`,
      submit: () => unwrapViaRunner(asset.tokenAddress, amountWei),
      onSubmitted: () => popupControls.close(),
    });
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
      max={maxUnwrapAmount}
      placeholder="0.00"
      style={inputStyle}
      bind:value={amount}
    />
    <div style="display:flex;justify-content:flex-end;margin-top:6px;">
      <button
        type="button"
        style="height:24px;padding:0 10px;border-radius:9999px;border:1px solid {T.hairline};background:transparent;color:{canUseMax ? T.inkMuted : T.inkFaint};font-size:11px;cursor:{canUseMax ? 'pointer' : 'not-allowed'};"
        onclick={() => (amount = Number(maxUnwrapAmount || 0))}
        disabled={!canUseMax}
      >Use max</button>
    </div>
  </div>

  <div style="display:flex;justify-content:flex-end;margin-top:4px;">
    <button
      type="button"
      style="height:40px;padding:0 22px;border-radius:9999px;border:0;background:{canUnwrap ? T.primary : T.pageDeep};color:{canUnwrap ? '#fff' : T.inkMuted};font-size:13px;font-weight:580;cursor:{canUnwrap ? 'pointer' : 'not-allowed'};box-shadow:{canUnwrap ? '0 4px 12px rgba(88,73,212,0.25)' : 'none'};"
      onclick={unwrap}
      disabled={!canUnwrap}
    >Unwrap</button>
  </div>
</div>
