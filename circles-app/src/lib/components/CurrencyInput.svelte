<script lang="ts">
  import { onMount } from 'svelte';
  import IMask from 'imask';
  import type { TokenBalanceRow } from '@circles-sdk/data';
  import { tokenTypeToString } from '$lib/pages/SelectAsset.svelte';
  import { roundToDecimals } from '$lib/utils/shared';
  import Avatar from './avatar/Avatar.svelte';

  interface Props {
    balanceRow: TokenBalanceRow;
    amount?: number;
    maxAmountCircles?: number;
  }

  let { balanceRow, amount = $bindable(0), maxAmountCircles = -1 }: Props = $props();

  let inputElement: HTMLInputElement = $state();
  let avatarWidth: string = '12rem';

  const maskOptions = {
    mask: Number,
    scale: 2,
    signed: false,
    thousandsSeparator: ',',
    padFractionalZeros: true,
    normalizeZeros: true,
    radix: '.',
    mapToRadix: ['.'],
    placeholderChar: '_', // Placeholder character
  };

  function set() {
    avatarWidth = 12.5 - inputElement.value.length * 0.6 + 'rem';
    amount = parseFloat(inputElement.value.replace(/,/g, '')) || 0;
    console.log('Amount set to:', amount);
  }

  function setMaxAmount() {
    amount =
      maxAmountCircles >= 0
        ? roundToDecimals(maxAmountCircles)
        : roundToDecimals(balanceRow.circles);
    inputElement.value = amount.toString();
    set();
  }

  onMount(() => {
    if (amount > 0) {
      setTimeout(() => {
        if (amount > balanceRow.circles) {
          amount = roundToDecimals(balanceRow.circles);
        }
        inputElement.value = amount.toString();
        set();
        IMask(inputElement, maskOptions);
      }, 0);
    }

    // Subscribe to all possible value changes of the text input. Should be called whenever the input changes.
    inputElement.oninput = () => {
      set();
    };
    inputElement.onblur = () => {
      setTimeout(set, 0); // Delay to allow for any potential input changes
    };

    IMask(inputElement, maskOptions);
  });
</script>

<div class="flex md:hidden mt-4 md:mt-4">
  <Avatar
    address={balanceRow?.tokenOwner}
    clickable={false}
    view="horizontal"
    bottomInfo={tokenTypeToString(balanceRow?.tokenType)}
  />
</div>

<div
  class="w-full flex items-center justify-between border border-gray-400 rounded-lg font-bold px-4 mt-4"
>
  <div class="flex items-center">
    <input
      type="text"
      placeholder="0.00"
      maxlength="7"
      class="input input-lg p-0 text-3xl w-44 placeholder-gray-400 focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-none tracking-wider"
      bind:this={inputElement}
    />
    <p class="text-3xl text-neutral-900 opacity-25">CRC</p>
  </div>
  <div class="hidden md:flex">
    <Avatar
      address={balanceRow?.tokenOwner}
      clickable={false}
      view="horizontal"
      bottomInfo={tokenTypeToString(balanceRow?.tokenType)}
    />
  </div>
</div>

<p class="font-medium text-sm mt-4">
  Balance: {maxAmountCircles >= 0
    ? roundToDecimals(maxAmountCircles)
    : roundToDecimals(balanceRow?.circles)}
  <button class="btn btn-sm ml-4 font-normal" onclick={setMaxAmount}>
    Use Max
  </button>
</p>
