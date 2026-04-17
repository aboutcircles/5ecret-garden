<script lang="ts">
    import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
    import type { Address } from '@aboutcircles/sdk-types';
    import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';

    interface Props {
        item: Address;
    }

    let { item }: Props = $props();

    function openProfile(addr: Address): void {
        openProfilePopup(addr);
    }

    function focusSearchInput(current?: HTMLElement | null): void {
        const scope = current?.closest<HTMLElement>('[data-profile-relations-list-scope]')
            ?? document.querySelector<HTMLElement>('[data-profile-relations-list-scope]');
        const input = scope?.querySelector<HTMLInputElement>('[data-profile-relations-search-input]');
        input?.focus();
    }

    const listNavigator = createKeyboardListNavigator({
        getRows: (anchor) => {
            const scope = anchor?.closest<HTMLElement>('[data-profile-relations-list-scope]')
                ?? document.querySelector<HTMLElement>('[data-profile-relations-list-scope]');
            return Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-trust-relation-row]'));
        },
        focusInput: (anchor) => {
            focusSearchInput(anchor);
        },
        onActivateRow: () => openProfile(item),
    });

    function onRowKeydown(event: KeyboardEvent): void {
        listNavigator.onRowKeydown(event);
    }

    function onRowClick(event: MouseEvent): void {
        listNavigator.onRowClick(event);
        openProfile(item);
    }
</script>

<div
    data-trust-relation-row
    data-row-address={item}
    tabindex={0}
    role="button"
    aria-label={`Open profile for ${item}`}
    class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    onkeydown={onRowKeydown}
    onclick={onRowClick}
>
    <RowFrame clickable={true} dense={true} noLeading={true}>
        <div class="min-w-0">
            <Avatar address={item} view="horizontal" clickable={true} showTypeInfo={true} />
        </div>
        {#snippet trailing()}<div aria-hidden="true">
            <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" aria-hidden="true" />
        </div>{/snippet}
    </RowFrame>
</div>