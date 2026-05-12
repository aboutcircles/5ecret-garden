<script lang="ts">
  import type { GroupRow } from '@circles-sdk/data';
  import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
  import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
  import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
  import { goto } from '$app/navigation';

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
  class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
  onkeydown={onRowKeydown}
  onclick={onRowClick}
>
  <RowFrame clickable={true} dense={true} noLeading={true}>
    <div class="min-w-0">
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

    {#snippet trailing()}
      <div aria-hidden="true">
        <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" />
      </div>
    {/snippet}
  </RowFrame>
</div>
