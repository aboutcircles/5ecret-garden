<script lang="ts">
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { formatUnits } from 'ethers';
  import { popupControls } from '$lib/shared/state/popup';
import { ProfilePopup } from '$lib/domains/profile/ui/pages';
  import type { Address } from '@circles-sdk/utils';
  import type { TrustRelation } from '@circles-sdk/data';

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
    popupControls.open({ component: ProfilePopup, props: { address: addr } });
  }

  function formatAmount(value: bigint): string {
    const etherString = formatUnits(value.toString(), 18);
    return parseFloat(etherString).toFixed(2);
  }

  function focusHoldersSearchInput(): void {
    const input = document.querySelector<HTMLInputElement>('[data-holders-search-input]');
    input?.focus();
  }

  function onRowKeydown(event: KeyboardEvent): void {
    const current = event.currentTarget as HTMLElement | null;
    if (!current) return;

    const target = event.target as HTMLElement | null;
    const isNestedTarget = !!target && target !== current;

    if (event.key === 'Enter' || event.key === ' ') {
      if (isNestedTarget) return;
      event.preventDefault();
      openProfile(item.avatar);
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    const scope = current.closest<HTMLElement>('[data-profile-holders-list-scope]');
    const rows = Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-holder-row]'));
    const index = rows.indexOf(current);
    if (index === -1) return;

    event.preventDefault();

    if (event.key === 'ArrowUp' && index === 0) {
      focusHoldersSearchInput();
      return;
    }

    const nextIndex = event.key === 'ArrowDown' ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= rows.length) return;
    rows[nextIndex]?.focus();
  }

  function onRowClick(event: MouseEvent): void {
    const current = event.currentTarget as HTMLElement | null;
    current?.focus();
    openProfile(item.avatar);
  }
</script>

<div
  data-holder-row
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