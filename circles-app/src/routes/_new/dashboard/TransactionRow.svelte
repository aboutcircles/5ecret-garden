<script lang="ts">
    import Avatar from "$lib/components/Avatar.svelte";
    import {crcTypes, getTimeAgo, staticTypes} from "$lib/utils/shared";
    import {roundToDecimals} from "$lib/utils/shared";
    import type {TransactionHistoryRow} from "@circles-sdk/data";
    import {tokenTypeToString} from "$lib/pages/SelectAsset.svelte";
    import {avatar} from "$lib/stores/avatar";

  export let item: TransactionHistoryRow;
</script>

<div
  class="flex items-center justify-between p-2 bg-base-100 hover:bg-base-200 rounded-lg"
>
  {#if item.from === '0x0000000000000000000000000000000000000000'}
    <Avatar address={item.to}>
      <img src="/logo.svg" alt="Incoming tokens" class="w-3 h-3 inline" />
      <a
        target="_blank"
        href={'https://gnosisscan.io/tx/' + item.transactionHash}
        class="underline"
      >
        Mint {tokenTypeToString(item.tokenType)}
      </a>
      <p>{getTimeAgo(item.timestamp)}</p>
    </Avatar>
  {:else if item.to === '0x0000000000000000000000000000000000000000'}
    <Avatar address={item.from}>
      <span>
        🔥 <a
          target="_blank"
          href={'https://gnosisscan.io/tx/' + item.transactionHash}
          class="underline"
        >
          Burn {tokenTypeToString(item.tokenType)}
        </a></span
      >
      <p>{getTimeAgo(item.timestamp)}</p>
    </Avatar>
  {:else if item.from === $avatar.address}
    <Avatar address={item.to}>
      <span>
        <img src="/outgoing.svg" alt="Outgoing tokens" class="w-3 h-3 inline" />
        <a
          target="_blank"
          href={'https://gnosisscan.io/tx/' + item.transactionHash}
          class="underline"
        >
          Send {tokenTypeToString(item.tokenType)}
        </a></span
      >
      <p>{getTimeAgo(item.timestamp)}</p>
    </Avatar>
  {:else if item.to === $avatar.address}
    <Avatar address={item.from}>
      <span
        ><img
          src="/incoming.svg"
          alt="Incoming tokens"
          class="w-3 h-3 inline"
        />
        <a
          target="_blank"
          href={'https://gnosisscan.io/tx/' + item.transactionHash}
          class="underline"
        >
          Receive {tokenTypeToString(item.tokenType)}
        </a></span
      >
      <p>{getTimeAgo(item.timestamp)}</p>
    </Avatar>
  {/if}

  <div class="col text-right">
    {#if item.from === $avatar.address}
      <span class="text-red-500 font-bold"
        >-{roundToDecimals(item.circles)}</span
      > Circles
    {:else}
      <span class="text-green-700 font-bold"
        >+{roundToDecimals(item.circles)}</span
      > Circles
    {/if}
    <p class="text-xs text-gray-500">
      {#if staticTypes.has(item.tokenType)}
        {roundToDecimals(item.staticCircles)} Static Circles
      {/if}
      {#if crcTypes.has(item.tokenType)}
        {roundToDecimals(item.crc)} CRC
      {/if}
    </p>
  </div>
</div>
