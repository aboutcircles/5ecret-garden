<script lang="ts">
  import { crcTypes, staticTypes } from '$lib/utils/shared';
  import { roundToDecimals } from '$lib/utils/shared';
  import type { TransactionHistoryRow } from '@circles-sdk/data';
  import { tokenTypeToString } from '$lib/pages/SelectAsset.svelte';
  import { avatar } from '$lib/stores/avatar';
  import { getTimeAgo } from '$lib/utils/shared';
  import Avatar from '$lib/components/avatar/Avatar.svelte';

  export let item: TransactionHistoryRow;

  const getBadge = () => {
    if (!$avatar) return;
    if (item.from === '0x0000000000000000000000000000000000000000')
      return '/badge-mint.svg';
    if (item.to === '0x0000000000000000000000000000000000000000')
      return '/badge-burn.svg';
    if (item.from === $avatar.address.toLowerCase()) return '/badge-sent.svg';
    if (item.to === $avatar.address.toLowerCase()) return '/badge-received.svg';
  };

  const getTransactionText = () => {
    if (!$avatar) return;

    const parsedDetails = JSON.parse(item.events);
    return parsedDetails.length.toString() + ' individual events in tx';
  };

  const counterpartyAddress = !$avatar ? '' :
    item.from === '0x0000000000000000000000000000000000000000'
      ? item.to
      : item.to === '0x0000000000000000000000000000000000000000'
        ? $avatar.address.toLowerCase()
        : item.from === $avatar.address.toLowerCase()
          ? item.to
          : item.from;
</script>

<a
    class="flex items-center justify-between p-2 hover:bg-black/5 rounded-lg"
    target="_blank"
    href={'https://gnosisscan.io/tx/' + item.transactionHash}
>
  <Avatar
      address={counterpartyAddress}
      view="horizontal"
      pictureOverlayUrl={getBadge()}
      topInfo={getTransactionText()}
      bottomInfo={getTimeAgo(item.timestamp)}
  />
  <div class="col text-right">
    {#if $avatar}
      {#if item.from === $avatar.address.toLowerCase()}
        <span class="text-red-500 font-bold"
        >-{roundToDecimals(item.circles)}</span
        > CRC
      {:else}
        <span class="text-green-700 font-bold"
        >+{roundToDecimals(item.circles)}</span
        > CRC
      {/if}
      <p class="text-xs text-gray-500">
        <!--{#if staticTypes.has(item.tokenType)}-->
        <!--  {roundToDecimals(item.staticCircles)} Static CRC-->
        <!--{/if}-->
        <!--{#if crcTypes.has(item.tokenType)}-->
        <!--  {roundToDecimals(item.crc)} CRC-->
        <!--{/if}-->
      </p>
    {:else}
      <!-- TODO: add loading state -->
      <p>loading</p>
    {/if}
  </div>
</a>
