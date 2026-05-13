<script lang="ts">
  import { getContext } from 'svelte';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { formatTrustRelation } from '$lib/shared/utils/helpers';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
  import type { AvatarSearchItem } from './avatarSearch.types';
  import { T } from '$lib/design-system/tokens.js';

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
  style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;background:{T.surface};border:1px solid {T.hairlineSoft};cursor:pointer;width:100%;box-sizing:border-box;outline:none;transition:background 180ms ease-out, border-color 180ms ease-out;"
  onkeydown={onRowKeydown}
  onclick={onRowClick}
>
  <div style="flex:1;min-width:0;">
    <Avatar
      address={item.address}
      {avatarInfo}
      view="horizontal"
      bottomInfo={bottomInfo}
      showTypeInfo={true}
      showBookmarkBadge={item.isVipBookmarked}
      clickable={true}
    />
  </div>
  <div aria-hidden="true">
    <img src="/chevron-right.svg" alt="" style="width:16px;height:16px;opacity:0.7;" aria-hidden="true" />
  </div>
</div>

<style>
  [data-avatar-search-row]:hover,
  [data-avatar-search-row]:focus-visible {
    background: #F6F5F2 !important;
    border-color: rgba(31,17,70,0.12) !important;
  }
</style>
