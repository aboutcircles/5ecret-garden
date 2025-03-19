<script lang="ts">
  import { getTimeAgo } from '$lib/utils/shared';
  import type { TransactionHistoryRow } from '@circles-sdk/data';
  import Avatar from '$lib/components/avatar/Avatar.svelte';
  import { avatar } from '$lib/stores/avatar';

  export let item: TransactionHistoryRow;

  let tags: string = "";
  let netCircles = 0;
  let counterpartyAddress = '';
  let badgeUrl: string | null = null;

  $: if ($avatar) {
    const result = parseEventDetails(item.events, $avatar.address.toLowerCase());
    tags = result.tags.join(", ");
    netCircles = item.circles;

    counterpartyAddress = getCounterpartyAddress($avatar.address).toLowerCase();
    badgeUrl = getBadge($avatar.address);
  }

  function parseEventDetails(eventsJson: string, avatarAddress: string) {
    let parsed: any[];
    try {
      parsed = JSON.parse(eventsJson) || [];
    } catch (err) {
      console.error('Failed to parse item.events:', err);
      parsed = [];
    }

    const relevantTypes = new Set([
      'CrcV1_Transfer',
      'CrcV2_PersonalMint',
      'CrcV2_DiscountCost',
      'CrcV2_GroupMint',
      'CrcV2_StreamCompleted',
      'CrcV2_WithdrawDemurraged',
      'CrcV2_WithdrawInflationary',
      'CrcV2_DepositDemurraged',
      'CrcV2_DepositInflationary',
      'CrcV2_CollateralLockedBatch',
      'CrcV2_CollateralLockedSingle',
      'CrcV2_GroupRedeem',
      'CrcV2_Trust',
      'CrcV2_RegisterHuman',
      'CrcV2_RegisterOrganization'
    ]);

    // let demurrageAmount = 0n;
    const tags: string[] = [];

    for (const e of parsed) {
      if (/*relevantTypes.has(e.$type) &&*/ !tags.includes(e.$type)) {
        tags.push(e.$type);
      }
    }

    return { tags };
  }

  function getCounterpartyAddress(avatarAddress: string) {
    if (item.from === '0x0000000000000000000000000000000000000000') return item.to.toLowerCase();
    if (item.to === '0x0000000000000000000000000000000000000000') return avatarAddress.toLowerCase();
    if (item.from.toLowerCase() === avatarAddress) return item.to.toLowerCase();
    return item.from.toLowerCase();
  }

  function getBadge(avatarAddress: string) {
    if (item.from === '0x0000000000000000000000000000000000000000') return '/badge-mint.svg';
    if (item.to === '0x0000000000000000000000000000000000000000') return '/badge-burn.svg';
    if (item.from.toLowerCase() === avatarAddress) return '/badge-sent.svg';
    if (item.to.toLowerCase() === avatarAddress) return '/badge-received.svg';
    return null;
  }
</script>

<a
  class="flex items-center justify-between p-2 hover:bg-black/5 rounded-lg"
  target="_blank"
  href={'https://gnosisscan.io/tx/' + item.transactionHash}
>
  {#if $avatar}
    <Avatar
      address={counterpartyAddress}
      view="horizontal"
      pictureOverlayUrl={badgeUrl}
      topInfo={tags}
      bottomInfo={getTimeAgo(item.timestamp)}
    />

    <div class="col text-right">
      {#if item.from.toLowerCase() === $avatar.address.toLowerCase()}
        <span class="text-red-500 font-bold">
          {#if netCircles.toFixed(2) === "0.00"}
                    &lt; 0.01
          {:else}
                    -{netCircles.toFixed(2)}
          {/if}
                </span> CRC
      {:else}
                <span class="text-green-700 font-bold">
                    +{netCircles.toFixed(2)}
                </span> CRC
      {/if}
      <p class="text-xs text-gray-500">
        <!-- Additional info ... -->
      </p>
    </div>
  {:else}
    <p>Loading avatar info...</p>
  {/if}
</a>
