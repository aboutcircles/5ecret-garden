<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import { crcTypes, getTimeAgo, staticTypes } from '$lib/utils/shared';
  import { roundToDecimals } from '$lib/utils/shared';
  import type { TransactionHistoryRow } from '@circles-sdk/data';
  import { tokenTypeToString } from '$lib/pages/SelectAsset.svelte';
  import { avatar } from '$lib/stores/avatar';

  export let item: TransactionHistoryRow;
</script>

<div
  class="flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg"
>
  {#if item.from === '0x0000000000000000000000000000000000000000'}
    <Avatar
      address={item.to}
      view="transaction_row"
      pictureOverlayUrl="/circles-badge.svg"
      date={item.timestamp}
    >
      <a
        target="_blank"
        href={'https://gnosisscan.io/tx/' + item.transactionHash}
        class="text-xs md:text-sm text-gray-500"
      >
        Minted {tokenTypeToString(item.tokenType)}
      </a>
    </Avatar>
  {:else if item.to === '0x0000000000000000000000000000000000000000'}
    <Avatar
      address={item.from}
      view="transaction_row"
      pictureOverlayUrl="/logo.svg"
      date={item.timestamp}
    >
      <a
        target="_blank"
        href={'https://gnosisscan.io/tx/' + item.transactionHash}
        class="text-xs md:text-sm text-gray-500"
      >
        Burn {tokenTypeToString(item.tokenType)}
      </a>
    </Avatar>
  {:else if item.from === $avatar.address}
    <Avatar
      address={item.to}
      view="transaction_row"
      pictureOverlayUrl="/sent-badge.svg"
      date={item.timestamp}
    >
      <a
        target="_blank"
        href={'https://gnosisscan.io/tx/' + item.transactionHash}
        class="text-xs md:text-sm text-gray-500"
      >
        Sent {tokenTypeToString(item.tokenType)}
      </a>
    </Avatar>
  {:else if item.to === $avatar.address}
    <Avatar
      address={item.from}
      view="transaction_row"
      pictureOverlayUrl="/received-badge.svg"
      date={item.timestamp}
    >
      <a
        target="_blank"
        href={'https://gnosisscan.io/tx/' + item.transactionHash}
        class="text-xs md:text-sm text-gray-500"
      >
        Received {tokenTypeToString(item.tokenType)}
      </a>
    </Avatar>
  {/if}

  <div class="col text-right">
    {#if item.from === $avatar.address}
      <span class="text-red-500 font-bold"
        >-{roundToDecimals(item.circles)}</span
      > CRC
    {:else}
      <span class="text-green-700 font-bold"
        >+{roundToDecimals(item.circles)}</span
      > CRC
    {/if}
    <p class="text-xs text-gray-500">
      {#if staticTypes.has(item.tokenType)}
        {roundToDecimals(item.staticCircles)} Static CRC
      {/if}
      {#if crcTypes.has(item.tokenType)}
        {roundToDecimals(item.crc)} CRC
      {/if}
    </p>
  </div>
</div>
