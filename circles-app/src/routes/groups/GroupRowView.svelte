<script lang="ts">
    import type { GroupRow } from '@circles-sdk/data';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import Icon from '$lib/design-system/Icon.svelte';
    import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
    import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
    import { T } from '$lib/design-system/tokens.js';

    interface Props { item: GroupRow; }
    let { item }: Props = $props();

    function openProfile() {
        openProfilePopup(item.group);
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
        onActivateRow: openProfile,
    });

    function onRowKeydown(event: KeyboardEvent): void {
        listNavigator.onRowKeydown(event);
    }

    function onRowClick(event: MouseEvent): void {
        listNavigator.onRowClick(event);
        openProfile();
    }
</script>

<div
    data-group-row
    tabindex={0}
    role="button"
    aria-label={`Open group ${item.group}`}
    class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    style="
        display:flex;align-items:center;gap:12px;padding:14px 20px;
        min-height:64px;cursor:pointer;
        border-bottom:1px solid {T.hairlineSoft};box-sizing:border-box;
        transition:background 180ms ease-out;
    "
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
            clickable={false}
            bottomInfo={`${item.memberCount} member${item.memberCount === 1 ? '' : 's'}`}
        />
    </div>
    <Icon name="chevronRight" size={14} stroke={T.inkFaint} />
</div>

<style>
  [data-group-row]:hover,
  [data-group-row]:focus-visible { background: #F6F5F2; }
</style>
