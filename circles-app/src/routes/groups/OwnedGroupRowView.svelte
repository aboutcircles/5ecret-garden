<script lang="ts">
  import type { GroupRow } from '@circles-sdk/data';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
  import { goto } from '$app/navigation';
  import { T } from '$lib/design-system/tokens.js';

  interface Props {
    item: GroupRow;
  }

  let { item }: Props = $props();

  function openMembers() {
    goto(`/groups/members/${item.group}`);
  }

  function focusGroupsSearchInput(current?: HTMLElement | null): void {
    const scope = current?.closest<HTMLElement>('[data-groups-list-scope]')
      ?? document.querySelector<HTMLElement>('[data-groups-list-scope]');
    const input = scope?.querySelector<HTMLInputElement>('[data-groups-search-input]');
    input?.focus();
  }

  const listNavigator = createKeyboardListNavigator({
    getRows: (anchor) => {
      const scope = anchor?.closest<HTMLElement>('[data-groups-list-scope]')
        ?? document.querySelector<HTMLElement>('[data-groups-list-scope]');
      return Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-group-row]'));
    },
    focusInput: focusGroupsSearchInput,
    onActivateRow: openMembers,
  });

  function onRowKeydown(event: KeyboardEvent): void {
    listNavigator.onRowKeydown(event);
  }

  function onRowClick(event: MouseEvent): void {
    listNavigator.onRowClick(event);
    openMembers();
  }
</script>

<div
  data-group-row
  tabindex={0}
  role="button"
  aria-label={`Manage members for group ${item.group}`}
  style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;background:{T.surface};border:1px solid {T.hairlineSoft};cursor:pointer;width:100%;box-sizing:border-box;outline:none;"
  onkeydown={onRowKeydown}
  onclick={onRowClick}
>
  <div style="flex:1;min-width:0;">
    <Avatar
      placeholderBottom={true}
      placeholderTop={false}
      placeholderAvatar={true}
      address={item.group}
      view="horizontal"
      clickable={true}
      bottomInfo={`${item.memberCount} member${item.memberCount === 1 ? '' : 's'}`}
    />
  </div>

  <div aria-hidden="true">
    <img src="/chevron-right.svg" alt="" style="width:16px;height:16px;opacity:0.7;" />
  </div>
</div>
