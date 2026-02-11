<script lang="ts">
    import type { GroupRow } from '@circles-sdk/data';
import { ProfilePopup } from '$lib/domains/profile/ui/pages';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { popupControls } from '$lib/shared/state/popup';
    import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';

    interface Props { item: GroupRow; }
    let { item }: Props = $props();

    function openProfile() {
        popupControls.open?.({ component: ProfilePopup, props: { address: item.group } });
    }

    function focusGroupsSearchInput(current: HTMLElement): void {
        const scope = current.closest<HTMLElement>('[data-groups-list-scope]');
        const input = scope?.querySelector<HTMLInputElement>('[data-groups-search-input]');
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

        const scope = current.closest<HTMLElement>('[data-groups-list-scope]');
        const rows = Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-group-row]'));
        const index = rows.indexOf(current);
        if (index === -1) return;

        event.preventDefault();

        if (event.key === 'ArrowUp' && index === 0) {
            focusGroupsSearchInput(current);
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
</script>

<div
    data-group-row
    tabindex={0}
    role="button"
    aria-label={`Open group ${item.group}`}
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

    {#snippet trailing()}<div aria-hidden="true">
            <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" />
        </div>{/snippet}
    </RowFrame>
</div>
