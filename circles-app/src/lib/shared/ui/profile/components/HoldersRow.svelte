<script lang="ts">
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { formatUnits } from 'ethers';
  import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
  import type { Address } from '@aboutcircles/sdk-types';
  import type { TrustRelationKind } from '$lib/shared/types/sdk-augment';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';

  interface HolderRow {
    avatar: Address;
    amount: bigint;
    amountToRedeem: bigint;
    amountToRedeemInCircles: number;
    trustRelation?: TrustRelationKind;
  }

  interface Props {
    item: HolderRow;
  }

  let { item }: Props = $props();

  function openProfile(addr: Address): void {
    openProfilePopup(addr);
  }

  function formatAmount(value: bigint): string {
    const etherString = formatUnits(value.toString(), 18);
    return parseFloat(etherString).toFixed(2);
  }

  function focusHoldersSearchInput(anchor?: HTMLElement | null): void {
    const scope = anchor?.closest<HTMLElement>('[data-profile-holders-list-scope]')
      ?? document.querySelector<HTMLElement>('[data-profile-holders-list-scope]');
    const input = scope?.querySelector<HTMLInputElement>('[data-holders-search-input]')
      ?? document.querySelector<HTMLInputElement>('[data-holders-search-input]');
    input?.focus();
  }

  const listNavigator = createKeyboardListNavigator({
    getRows: (anchor) => {
      const scope = anchor?.closest<HTMLElement>('[data-profile-holders-list-scope]')
        ?? document.querySelector<HTMLElement>('[data-profile-holders-list-scope]');
      return Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-holder-row]'));
    },
    focusInput: focusHoldersSearchInput,
    onActivateRow: () => openProfile(item.avatar),
  });

  function onRowKeydown(event: KeyboardEvent): void {
    listNavigator.onRowKeydown(event);
  }

  function onRowClick(event: MouseEvent): void {
    listNavigator.onRowClick(event);
    openProfile(item.avatar);
  }
</script>

<div
  data-holder-row
  data-row-address={item.avatar}
  tabindex={0}
  role="button"
  aria-label={`Open holder ${item.avatar}`}
  class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
  onkeydown={onRowKeydown}
  onclick={onRowClick}
>
  <RowFrame clickable={true} dense={true} noLeading={true}>
    <div class="min-w-0">
      <Avatar address={item.avatar} clickable={true} view="horizontal" showTypeInfo={true} />
    </div>
    {#snippet trailing()}<div class="text-right tabular-nums">
      <div class="font-medium">{formatAmount(item.amount)} CRC</div>
    </div>{/snippet}
  </RowFrame>
</div>