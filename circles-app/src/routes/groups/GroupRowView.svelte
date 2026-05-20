<script lang="ts">
    import type { GroupRow } from '@aboutcircles/sdk-types';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
    import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
    import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
    import { probeOptOutSupport } from '$lib/areas/groups/utils/optOutSupport';
    import { openFlowPopup } from '$lib/shared/state/popup';
    import LeaveGroup from '$lib/areas/groups/ui/pages/LeaveGroup.svelte';

    interface Props {
        item: GroupRow;
        showOptOut?: boolean;
        onLeft?: () => void | Promise<void>;
    }
    let { item, showOptOut = false, onLeft }: Props = $props();

    let optOutSupported: boolean = $state(false);

    $effect(() => {
        if (!showOptOut) return;
        let cancelled = false;
        void probeOptOutSupport(item.group).then((supported) => {
            if (!cancelled) optOutSupported = supported;
        });
        return () => { cancelled = true; };
    });

    function openProfile() {
        openProfilePopup(item.group);
    }

    function openLeaveGroupFlow(event: MouseEvent) {
        event.stopPropagation();
        openFlowPopup({
            title: 'Opt out of group',
            component: LeaveGroup,
            props: { group: item.group, onLeft },
        });
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
            <div class="flex items-center gap-2">
                {#if showOptOut && optOutSupported}
                    <button
                        type="button"
                        class="btn btn-xs btn-outline btn-error"
                        onclick={openLeaveGroupFlow}
                        aria-label={`Opt out of group ${item.group}`}
                    >
                        Opt out
                    </button>
                {/if}
                <div aria-hidden="true">
                    <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" />
                </div>
            </div>
        {/snippet}
    </RowFrame>
</div>
