<script lang="ts">
  import { ethers } from 'ethers';
  import PopupActionBar from '$lib/shared/ui/shell/PopupActionBar.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import type { TokenBalance } from '@aboutcircles/sdk-types';
  import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
  import { roundToDecimals } from '$lib/shared/utils/shared';
  import { executeTxSubmitFirst } from '$lib/shared/utils/txExecution';
  import { popupControls } from '$lib/shared/state/popup';

  interface Props {
    asset: TokenBalance;
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
    const receipt = await avatarState.avatar?.wrap.asInflationary(asset.tokenAddress, sendValue);
    if (!receipt) {
      throw new Error('Failed to wrap Circles');
    }
  }

  async function wrapDemurraged(sendValue: bigint) {
    if (avatarState.avatar?.avatarInfo?.version !== 2) {
      throw new Error('Only supported for Avatar v2');
    }
    const receipt = await avatarState.avatar?.wrap.asDemurraged(asset.tokenAddress, sendValue);
    if (!receipt) {
      throw new Error('Failed to wrap Circles');
    }
  }
</script>

<div class="p-6 pt-0">
  <div class="form-control mb-4">
    <p class="menu-title pl-0">Token</p>
    <BalanceRow item={asset} />
  </div>

  <div class="form-control mb-2">
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

  <div class="flex justify-end mb-4">
    <button
      type="button"
      class="btn btn-ghost btn-xs"
      onclick={() => (amount = Number(asset.circles || 0))}
    >
      Use max
    </button>
  </div>

  <div class="form-control mb-4">
    <p class="text-xs text-base-content/70">
      Wrapping creates a transferable token. You can unwrap anytime.
    </p>
  </div>

  <div class="form-control mb-4">
    <button
      type="button"
      class="btn btn-ghost btn-sm justify-between"
      aria-expanded={showAdvanced}
      onclick={() => (showAdvanced = !showAdvanced)}
    >
      <span>Advanced</span>
      <span class="text-xs">{showAdvanced ? 'Hide' : 'Show'}</span>
    </button>

    {#if showAdvanced}
      <div class="mt-2">
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
    {/if}
  </div>

  <PopupActionBar>
    <button type="submit" class="btn btn-primary btn-sm" onclick={wrap} disabled={!canWrap}>Wrap</button>
  </PopupActionBar>
</div>
