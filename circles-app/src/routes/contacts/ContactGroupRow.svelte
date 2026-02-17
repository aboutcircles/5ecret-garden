<script lang="ts">
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
    import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
    import type { Address } from '@circles-sdk/utils';
    import type { AppProfileCore as Profile } from '$lib/shared/model/profile';
    import type { AvatarRow } from '@circles-sdk/data';
    import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';

    interface Props {
        address?: Address;
        profile?: Profile;
        avatarInfo?: AvatarRow;
        trustRelation?: string;
    }
    let { address, profile, avatarInfo, trustRelation = '' }: Props = $props();

    function openProfile() {
        if (!address) return;
        openProfilePopup(address);
    }

    function focusSearchInput(anchor?: HTMLElement | null): void {
        const scope = anchor?.closest<HTMLElement>('[data-contacts-list-scope]')
            ?? document.querySelector<HTMLElement>('[data-contacts-list-scope]');
        const input = scope?.querySelector<HTMLInputElement>('[data-contacts-search-input]')
            ?? document.querySelector<HTMLInputElement>('[data-contacts-search-input]');
        input?.focus();
    }

    const listNavigator = createKeyboardListNavigator({
        getRows: (anchor) => {
            const scope = anchor?.closest<HTMLElement>('[data-contacts-list-scope]')
                ?? document.querySelector<HTMLElement>('[data-contacts-list-scope]');
            return Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-contact-row]'));
        },
        focusInput: focusSearchInput,
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
    data-contact-row
    tabindex={0}
    role="button"
    aria-label={`Open profile for ${address ?? 'contact'}`}
    class="rounded-[var(--row-radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    onkeydown={onRowKeydown}
    onclick={onRowClick}
>
    <RowFrame clickable={true} dense={true} noLeading={true}>
        <div class="min-w-0">
            <Avatar
                address={address}
                {profile}
                {avatarInfo}
                view="horizontal"
                bottomInfo={trustRelation}
                showTypeInfo={false}
                clickable={true}
            />
        </div>
        {#snippet trailing()}<div aria-hidden="true">
            <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" aria-hidden="true" />
        </div>{/snippet}
    </RowFrame>
</div>
