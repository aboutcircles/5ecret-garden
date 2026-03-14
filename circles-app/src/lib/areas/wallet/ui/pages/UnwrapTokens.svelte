<script lang="ts">
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import PopupActionBar from '$lib/shared/ui/shell/PopupActionBar.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { ethers } from 'ethers';
  import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import { roundToDecimals } from '$lib/shared/utils/shared';
  import { executeTxSubmitFirst } from '$lib/shared/utils/txExecution';
  import { popupControls } from '$lib/shared/state/popup';

  interface Props {
    asset: TokenBalanceRow;
  }

  let { asset }: Props = $props();

  let amount: number = $state(0);
  const maxUnwrapAmount = $derived(asset.isWrapped ? asset.staticCircles : asset.circles);
  const canUseMax = $derived(
    Number.isFinite(Number(maxUnwrapAmount)) && Number(maxUnwrapAmount) > 0
  );

  async function unwrap() {
    const tokenInfo = await $circles?.data?.getTokenInfo(asset.tokenAddress);
    if (!tokenInfo) {
      return;
    }
    if (!avatarState.avatar) {
      throw new Error('Avatar not loaded');
    }
    const avatar = avatarState.avatar;

    if (tokenInfo.type === 'CrcV2_ERC20WrapperDeployed_Inflationary') {
      void executeTxSubmitFirst({
        name: `Unwrap ${roundToDecimals(amount)} static tokens ...`,
        submit: () => avatar.unwrapInflationErc20(
          asset.tokenAddress,
          BigInt(ethers.parseEther(amount.toString()))
        ),
        onSubmitted: () => popupControls.close(),
      });
    } else if (tokenInfo.type === 'CrcV2_ERC20WrapperDeployed_Demurraged') {
      void executeTxSubmitFirst({
        name: `Unwrap ${roundToDecimals(amount)} tokens ...`,
        submit: () => avatar.unwrapDemurrageErc20(
          asset.tokenAddress,
          BigInt(ethers.parseEther(amount.toString()))
        ),
        onSubmitted: () => popupControls.close(),
      });
    } else {
      throw new Error('Unsupported token type');
    }
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
