<script lang="ts">
  import { avatarState } from '$lib/stores/avatar.svelte';
  import { circles } from '$lib/stores/circles';
  import { ethers } from 'ethers';
  import BalanceRow from '$lib/components/BalanceRow.svelte';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import { roundToDecimals } from '$lib/utils/shared';
  import { runTask } from '$lib/utils/tasks';
  import { popupControls } from '$lib/stores/popUp';

  interface Props {
    asset: TokenBalanceRow;
  }

  let { asset }: Props = $props();

  let amount: number = $state(0);

  async function unwrap() {
    const tokenInfo = await $circles?.data?.getTokenInfo(asset.tokenAddress);
    if (!tokenInfo) {
      return;
    }
    if (!avatarState.avatar) {
      throw new Error('Avatar not loaded');
    }

    if (tokenInfo.type === 'CrcV2_ERC20WrapperDeployed_Inflationary') {
      runTask({
        name: `Unwrap ${roundToDecimals(amount)} static tokens ...`,
        promise: avatarState.avatar.unwrapInflationErc20(
          asset.tokenAddress,
          BigInt(ethers.parseEther(amount.toString()))
        ),
      });
    } else if (tokenInfo.type === 'CrcV2_ERC20WrapperDeployed_Demurraged') {
      runTask({
        name: `Unwrap ${roundToDecimals(amount)} tokens ...`,
        promise: avatarState.avatar.unwrapDemurrageErc20(
          asset.tokenAddress,
          BigInt(ethers.parseEther(amount.toString()))
        ),
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
      max={asset.circles}
      placeholder="0.00"
      class="input input-bordered w-full"
      bind:value={amount}
    />
  </div>

  <div class="modal-action">
    <button type="submit" class="btn btn-primary" onclick={unwrap}
      >Unwrap</button
    >
  </div>
</div>
