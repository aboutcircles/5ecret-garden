<script lang="ts">
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import { circles } from '$lib/shared/state/circles';
  import { ethers } from 'ethers';
  import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
  import type { TokenBalance } from '@aboutcircles/sdk-types';
  import { roundToDecimals } from '$lib/shared/utils/shared';
  import { runTask } from '$lib/shared/utils/tasks';
  import { popupControls } from '$lib/shared/state/popup/popUp.svelte';

  interface Props {
    asset: TokenBalance;
  }

  let { asset }: Props = $props();

  let amount: number = $state(0);

  async function unwrap() {
    if (!$circles) {
      throw new Error('SDK not loaded');
    }

    const tokenInfo = await $circles.rpc.token.getTokenInfo(asset.tokenAddress);
    if (!tokenInfo) {
      throw new Error('Token info not found');
    }
    if (!avatarState.avatar) {
      throw new Error('Avatar not loaded');
    }

    const amountInAttoCircles = BigInt(ethers.parseEther(amount.toString()));

    if (tokenInfo.tokenType === 'CrcV2_ERC20WrapperDeployed_Inflationary') {
      runTask({
        name: `Unwrap ${roundToDecimals(amount)} static tokens ...`,
        promise: avatarState.avatar.wrap.unwrapInflationary(
          asset.tokenAddress,
          amountInAttoCircles
        ),
      });
    } else if (
      tokenInfo.tokenType === 'CrcV2_ERC20WrapperDeployed_Demurraged'
    ) {
      runTask({
        name: `Unwrap ${roundToDecimals(amount)} tokens ...`,
        promise: avatarState.avatar.wrap.unwrapDemurraged(
          asset.tokenAddress,
          amountInAttoCircles
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
