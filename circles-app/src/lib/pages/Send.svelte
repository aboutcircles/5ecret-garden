<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import { tokenTypeToString } from '$lib/pages/SelectAsset.svelte';
  import { createEventDispatcher } from 'svelte';
  import { roundToDecimals, shortenAddress } from '$lib/utils/shared';
  import type { TokenBalanceRow } from '@circles-sdk/data';

  export let receiverAddress: string | undefined;
  export let asset: TokenBalanceRow | undefined;
  export let amount: number = 0;
  export let textButton: string;

  const eventDispatcher = createEventDispatcher();
</script>

<!-- Receiver Information -->
<div class="mt-4 flex flex-col gap-y-4">
  <p class="menu-title p-0">Asset:</p>

  <div class="flex items-center justify-between p-4 border-b md:border md:rounded-lg">
    <div class="col">
      <Avatar address={asset?.tokenOwner} clickable={false}>
        <span>
          {tokenTypeToString(asset?.tokenType)}
        </span>
      </Avatar>
    </div>

    <div class="col text-right">
      <span class="text-2xl">{roundToDecimals(amount)}</span> Circles
    </div>
  </div>
  <p class="menu-title mt-8 md:mt-4 p-0">To:</p>
  <div class="flex items-center justify-between p-4 border-b md:border md:rounded-lg">
    <Avatar address={receiverAddress} clickable={false}>
      <a
        target="_blank"
        href={'https://gnosisscan.io/address/' + receiverAddress}
        >{shortenAddress(receiverAddress)}</a
      >
    </Avatar>
  </div>

  <!-- Action Buttons -->
  <div class="flex justify-end space-x-2 mt-6">
    <button
      type="submit"
      class="btn btn-primary text-white max-sm:w-full"
      on:click={() => eventDispatcher('select', { amount: amount })}
    >
      {textButton}
    </button>
  </div>
</div>
