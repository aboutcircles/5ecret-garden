<script lang="ts">
  import Avatar from '$lib/components/Avatar/Avatar.svelte';
  import { crcTypes, staticTypes } from '$lib/utils/shared';
  import { roundToDecimals } from '$lib/utils/shared';
  import type { TransactionHistoryRow } from '@circles-sdk/data';
  import { tokenTypeToString } from '$lib/pages/SelectAsset.svelte';
  import { avatar } from '$lib/stores/avatar';
  import { getTimeAgo } from '$lib/utils/shared';

  export let item: TransactionHistoryRow;

  const getBadge = () => {
    if (!$avatar) return;
    if (item.from === '0x0000000000000000000000000000000000000000')
      return '/badge-mint.svg';
    if (item.to === '0x0000000000000000000000000000000000000000')
      return '/badge-burn.svg';
    if (item.from === $avatar.address) return '/badge-sent.svg';
    if (item.to === $avatar.address) return '/badge-received.svg';
  };

  const getTransactionText = () => {
    if (!$avatar) return;
    if (item.from === '0x0000000000000000000000000000000000000000')
      return `Minted ${tokenTypeToString(item.tokenType)}`;
    if (item.to === '0x0000000000000000000000000000000000000000')
      return `Burn ${tokenTypeToString(item.tokenType)}`;
    if (item.from === $avatar.address)
      return `Sent ${tokenTypeToString(item.tokenType)}`;
    return `Received ${tokenTypeToString(item.tokenType)}`;
  };

  const counterpartyAddress =
    item.from === '0x0000000000000000000000000000000000000000'
      ? item.to
      : item.to === '0x0000000000000000000000000000000000000000'
        ? $avatar.address
        : item.from === $avatar.address
          ? item.to
          : item.from;
</script>

<div
  class="flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg"
>
  <!-- <Avatar
    address={counterpartyAddress}
    view="transaction_row"
    pictureOverlayUrl={getBadge()}
    date={item.timestamp}
  >
    <a
      target="_blank"
      href={'https://gnosisscan.io/tx/' + item.transactionHash}
      class="text-xs md:text-sm text-gray-500"
    >
      {getTransactionText()}
    </a>
  </Avatar> -->
  <Avatar
    address={counterpartyAddress}
    view="horizontal"
    pictureOverlayUrl={getBadge()}
    topInfo={getTransactionText()}
    bottomInfo={getTimeAgo(item.timestamp)}
  />
    <!-- <a
      target="_blank"
      href={'https://gnosisscan.io/tx/' + item.transactionHash}
      class="text-xs md:text-sm text-gray-500"
    >
      {getTransactionText()}
    </a>
  </Avatar> -->

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
