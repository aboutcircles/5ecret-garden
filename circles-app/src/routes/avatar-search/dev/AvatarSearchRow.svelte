<script lang="ts">
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
import { ProfilePopup } from '$lib/domains/profile/ui/pages';
  import { popupControls } from '$lib/shared/state/popup';
  import RowFrame from '$lib/shared/ui/RowFrame.svelte';
  import { formatTrustRelation } from '$lib/shared/utils/helpers';
  import type { AvatarSearchItem } from './avatarSearch.types';

  interface Props {
    item: AvatarSearchItem;
  }

  let { item }: Props = $props();

  function openProfile() {
    popupControls.open?.({ component: ProfilePopup, props: { address: item.address } });
  }

  function focusSearchInput(): void {
    const input = document.querySelector<HTMLInputElement>('[data-avatar-search-input]');
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
      openProfile();
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-avatar-search-row]'));
    const index = rows.indexOf(current);
    if (index === -1) return;

    event.preventDefault();

    if (event.key === 'ArrowUp' && index === 0) {
      focusSearchInput();
      return;
    }

    const nextIndex = event.key === 'ArrowDown' ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= rows.length) return;
    rows[nextIndex]?.focus();
  }

  function onRowClick(event: MouseEvent): void {
    const current = event.currentTarget as HTMLElement | null;
    current?.focus();
    openProfile();
  }

  let bottomInfo: string = $derived(item.trustRelation ? formatTrustRelation(item.trustRelation as any) : '');
</script>

<div
  data-avatar-search-row
  tabindex={0}
  role="button"
  aria-label={`Open profile for ${item.address}`}
  class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
  onkeydown={onRowKeydown}
  onclick={onRowClick}
>
  <RowFrame clickable={true} dense={true} noLeading={true}>
    <div class="min-w-0">
      <Avatar
        address={item.address}
        view="horizontal"
        bottomInfo={bottomInfo}
        showTypeInfo={true}
        showBookmarkBadge={item.isVipBookmarked}
        clickable={true}
      />
    </div>
    {#snippet trailing()}<div aria-hidden="true">
      <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" aria-hidden="true" />
    </div>{/snippet}
  </RowFrame>
</div>
