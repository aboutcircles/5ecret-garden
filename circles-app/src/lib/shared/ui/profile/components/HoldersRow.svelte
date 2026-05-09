<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { formatUnits } from 'ethers';
  import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
  import type { Address } from '@circles-sdk/utils';
  import type { TrustRelation } from '@circles-sdk/data';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
  import { T } from '$lib/design-system/tokens.js';

  interface HolderRow {
    avatar: Address;
    amount: bigint;
    amountToRedeem: bigint;
    amountToRedeemInCircles: number;
    trustRelation?: TrustRelation;
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
  style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;background:{T.surface};border:1px solid {T.hairlineSoft};cursor:pointer;width:100%;box-sizing:border-box;outline:none;"
  onkeydown={onRowKeydown}
  onclick={onRowClick}
>
  <div style="flex:1;min-width:0;">
    <Avatar address={item.avatar} clickable={true} view="horizontal" showTypeInfo={true} />
  </div>
  <div style="text-align:right;font-variant-numeric:tabular-nums;">
    <div style="font-size:13px;font-weight:500;color:{T.ink};">{formatAmount(item.amount)} CRC</div>
  </div>
</div>
