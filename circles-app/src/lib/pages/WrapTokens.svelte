<script lang="ts">
  import { ethers } from 'ethers';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import BalanceRow from '$lib/components/BalanceRow.svelte';
  import { roundToDecimals } from '$lib/utils/shared';
  import { runTask } from '$lib/utils/tasks';
  import { popupControls } from '$lib/stores/popUp';

  interface Props {
    asset: TokenBalanceRow;
  }

  let { asset }: Props = $props();

  let wrapType: 'Static' | 'Demurraged' = $state('Static');
  let amount: number = $state(0);

  async function wrap() {
    const sendValue = ethers.parseEther(amount.toString());
    if (wrapType == 'Demurraged') {
      runTask({
        name: `Wrap ${roundToDecimals(amount)} Circles as Demurraged ERC20...`,
        promise: wrapDemurraged(sendValue),
      });
    } else {
      runTask({
        name: `Wrap ${roundToDecimals(amount)} Circles as Inflationary ERC20...`,
        promise: wrapInflationary(sendValue),
      });
    }
    popupControls.close();
  }

  async function wrapInflationary(sendValue: bigint) {
    if (avatarState.avatar?.avatarInfo?.version !== 2) {
      throw new Error('Only supported for Avatar v2');
    }
    const receipt = await avatarState.avatar?.wrapInflationErc20(
      asset.tokenAddress,
      sendValue
    );
    if (!receipt) {
      throw new Error('Failed to wrap Circles');
    }
  }

  async function wrapDemurraged(sendValue: bigint) {
    if (avatarState.avatar?.avatarInfo?.version !== 2) {
      throw new Error('Only supported for Avatar v2');
    }
    const receipt = await avatarState.avatar?.wrapDemurrageErc20(
      asset.tokenAddress,
      sendValue
    );
    if (!receipt) {
      throw new Error('Failed to wrap Circles');
    }
  }
</script>

<!-- Form for entering the amount and selecting the wrapping type -->

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

  <div class="form-control mb-4">
    <p class="menu-title pl-0">Type</p>
    <div class="flex space-x-4">
      <label class="cursor-pointer flex items-center">
        <input
          type="radio"
          name="wrapType"
          value="Static"
          bind:group={wrapType}
          class="radio radio-primary"
        />
        <span class="ml-2">Static</span>
      </label>
      <label class="cursor-pointer flex items-center">
        <input
          type="radio"
          name="wrapType"
          value="Demurraged"
          bind:group={wrapType}
          class="radio radio-primary"
        />
        <span class="ml-2">Demurraged</span>
      </label>
    </div>
  </div>

  <div class="modal-action">
    <button type="submit" class="btn btn-primary" onclick={wrap}>Wrap</button>
  </div>
</div>
