<script lang="ts">
  import { getContext } from 'svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import { formatTrustRelation } from '$lib/shared/utils/helpers';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
  import type { AvatarSearchItem } from './avatarSearch.types';

  const ACTIVATE_CTX_KEY = 'avatar-search-row-activate';
  type ActivateRow = (item: AvatarSearchItem) => void;

  interface Props {
    item: AvatarSearchItem;
  }

  let { item }: Props = $props();

  const activate = getContext<ActivateRow | undefined>(ACTIVATE_CTX_KEY);

  function runActivate(): void {
    activate?.(item);
  }

  function focusSearchInput(anchor?: HTMLElement | null): void {
    const scope = anchor?.closest<HTMLElement>('[data-avatar-search-list-scope]')
      ?? document.querySelector<HTMLElement>('[data-avatar-search-list-scope]');
    const input = scope?.querySelector<HTMLInputElement>('[data-avatar-search-input]')
      ?? document.querySelector<HTMLInputElement>('[data-avatar-search-input]');
    input?.focus();
  }

  const listNavigator = createKeyboardListNavigator({
    getRows: (anchor) => {
      const scope = anchor?.closest<HTMLElement>('[data-avatar-search-list-scope]')
        ?? document.querySelector<HTMLElement>('[data-avatar-search-list-scope]');
      return Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-avatar-search-row]'));
    },
    focusInput: focusSearchInput,
    onActivateRow: runActivate,
  });

  function onRowKeydown(event: KeyboardEvent): void {
    listNavigator.onRowKeydown(event);
  }

  function onRowClick(event: MouseEvent): void {
    listNavigator.onRowClick(event);
    runActivate();
  }

  const bottomInfo = $derived(item.trustRelation ? formatTrustRelation(item.trustRelation as any) : '');

  const avatarInfo = $derived.by(() => {
    if (!item.avatarType) return undefined;
    return {
      avatar: item.address,
      type: item.avatarType,
    } as any;
  });
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
        clickable={true}
      />
    </div>
    {#snippet trailing()}<div aria-hidden="true">
      <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" aria-hidden="true" />
    </div>{/snippet}
  </RowFrame>
</div>
