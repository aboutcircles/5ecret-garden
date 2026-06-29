<script lang="ts">
    import type { GroupRow } from '@aboutcircles/sdk-types';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import Icon from '$lib/design-system/Icon.svelte';
    import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
    import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
    import { probeOptOutSupport } from '$lib/areas/groups/utils/optOutSupport';
    import { openFlowPopup } from '$lib/shared/state/popup';
    import LeaveGroup from '$lib/areas/groups/ui/pages/LeaveGroup.svelte';
    import { T } from '$lib/design-system/tokens.js';
    import { avatarState } from '$lib/shared/state/avatar.svelte';
    import { joinCommunity, isAffiliateRegistryAvailable } from '$lib/areas/groups/utils/affiliateGroupActions';
    import { invalidateCommunities } from '$lib/areas/groups/state/communitiesSignal.svelte';

    interface Props {
        item: GroupRow;
        showOptOut?: boolean;
        onLeft?: () => void | Promise<void>;
    }
    let { item, showOptOut = false, onLeft }: Props = $props();

    let optOutSupported: boolean = $state(false);

    // "Join as community" = signal on-chain intent in the multi-affiliate registry.
    // Only humans can signal, and only where the registry is configured (Gnosis).
    let joining: boolean = $state(false);
    const canJoin = $derived(isAffiliateRegistryAvailable() && avatarState.isHuman === true);

    async function handleJoin(event: MouseEvent): Promise<void> {
        event.stopPropagation();
        if (joining) return;
        joining = true;
        try {
            await joinCommunity(item.group);
            invalidateCommunities();
        } catch (e) {
            // The task runner surfaces the failure; keep the row interactive.
            console.error('Failed to join community', e);
        } finally {
            joining = false;
        }
    }

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
    {#if canJoin}
        <button
            type="button"
            class="btn btn-xs btn-outline"
            onclick={handleJoin}
            disabled={joining}
            aria-label={`Join community ${item.group}`}
        >
            {joining ? 'Joining…' : 'Join'}
        </button>
    {/if}
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
    <Icon name="chevronRight" size={14} stroke={T.inkFaint} />
</div>

<style>
  [data-group-row]:hover,
  [data-group-row]:focus-visible { background: #F6F5F2; }
</style>
