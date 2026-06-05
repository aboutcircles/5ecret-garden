<script lang="ts">
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import PopupActionBar from '$lib/shared/ui/shell/PopupActionBar.svelte';
  import { ethers } from 'ethers';
  import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
  import type { TokenBalance } from '@aboutcircles/sdk-types';
  import { roundToDecimals } from '$lib/shared/utils/shared';
  import { executeTxSubmitFirst } from '$lib/shared/utils/txExecution';
  import { popupControls } from '$lib/shared/state/popup';
  import { wallet } from '$lib/shared/state/wallet.svelte';
  import { get } from 'svelte/store';
  import { sendRunnerTransactionAndWait } from '$lib/shared/utils/tx';

  interface Props {
    asset: TokenBalance;
  }

  let { asset }: Props = $props();

  let amount: number = $state(0);
  const maxUnwrapAmount = $derived(asset.isWrapped ? asset.staticCircles : asset.circles);
  const canUseMax = $derived(
    Number.isFinite(Number(maxUnwrapAmount)) && Number(maxUnwrapAmount) > 0
  );

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

    // asset.tokenType is the same field the row-action button gates on
    // (BalanceRowActions.svelte) — by the time we're here it must be a wrapper.
    const isInflationary =
      asset.tokenType === 'CrcV2_ERC20WrapperDeployed_Inflationary';
    const isDemurraged =
      asset.tokenType === 'CrcV2_ERC20WrapperDeployed_Demurraged';

    if (!isInflationary && !isDemurraged) {
      throw new Error(`Unsupported token type: ${asset.tokenType ?? 'unknown'}`);
    }

    void executeTxSubmitFirst({
      name: `Unwrap ${roundToDecimals(amount)} ${isInflationary ? 'static ' : ''}tokens ...`,
      submit: () => unwrapViaRunner(asset.tokenAddress, amountWei),
      onSubmitted: () => popupControls.close(),
    });
  }
</script>

<div class="p-6 pt-0">
  <div class="form-control mb-4">
    <p class="menu-title pl-0">Token</p>
    <BalanceRow item={asset} />
  </div>

  <div class="form-control mb-4">
    <p class="menu-title pl-0">Amount</p>
    <input
      type="number"
      step="0.01"
      min="0"
      max={maxUnwrapAmount}
      placeholder="0.00"
      class="input input-bordered w-full"
      bind:value={amount}
    />
  </div>

  <div class="flex justify-end mb-4">
    <button
      type="button"
      class="btn btn-ghost btn-xs"
      onclick={() => (amount = Number(maxUnwrapAmount || 0))}
      disabled={!canUseMax}
    >
      Use max
    </button>
  </div>

  <PopupActionBar>
    <button type="submit" class="btn btn-primary btn-sm" onclick={unwrap}
      >Unwrap</button
    >
  </PopupActionBar>
</div>
