<script lang="ts">
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import PopupActionBar from '$lib/shared/ui/shell/PopupActionBar.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { ethers } from 'ethers';
  import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import { roundToDecimals } from '$lib/shared/utils/shared';
  import { runTask } from '$lib/shared/utils/tasks';
  import { popupControls } from '$lib/shared/state/popup';
  import { wallet } from '$lib/shared/state/wallet.svelte';
  import { get } from 'svelte/store';
  import { sendRunnerTransactionAndWait } from '$lib/shared/utils/tx';

  interface Props {
    asset: TokenBalanceRow;
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
    const tokenInfo = await $circles?.data?.getTokenInfo(asset.tokenAddress);
    if (!tokenInfo) {
      return;
    }
    if (!avatarState.avatar) {
      throw new Error('Avatar not loaded');
    }

    const amountWei = BigInt(ethers.parseEther(amount.toString()));

    if (tokenInfo.type === 'CrcV2_ERC20WrapperDeployed_Inflationary') {
      runTask({
        name: `Unwrap ${roundToDecimals(amount)} static tokens ...`,
        promise: unwrapViaRunner(asset.tokenAddress, amountWei),
      });
    } else if (tokenInfo.type === 'CrcV2_ERC20WrapperDeployed_Demurraged') {
      runTask({
        name: `Unwrap ${roundToDecimals(amount)} tokens ...`,
        promise: unwrapViaRunner(asset.tokenAddress, amountWei),
      });
    } else {
      throw new Error('Unsupported token type');
    }
    popupControls.close();
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
