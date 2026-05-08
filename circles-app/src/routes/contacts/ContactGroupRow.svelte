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
        relation?: string;
    }
    let { address, profile, avatarInfo, trustRelation = '', relation = '' }: Props = $props();

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

    const pillConfig = $derived.by(() => {
        switch (relation) {
            case 'mutuallyTrusts':  return { label: 'Both accept', bg: '#DCEBDF', color: '#2D8A52' };
            case 'trusts':          return { label: 'You accept',  bg: '#FBEFCB', color: '#B07014' };
            case 'trustedBy':       return { label: 'Accepts you', bg: '#EEEBFA', color: '#5849D4' };
            case 'variesByVersion': return { label: 'Varies',      bg: '#F6F5F2', color: 'rgba(15,10,30,0.55)' };
            default: return null;
        }
    });
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
        <div class="min-w-0 flex-1">
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
        {#snippet trailing()}
            <div class="flex items-center gap-2 shrink-0">
                {#if pillConfig}
                    <span
                        class="hidden sm:inline-flex text-[10.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                        style="background:{pillConfig.bg};color:{pillConfig.color};"
                    >{pillConfig.label}</span>
                {/if}
                <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-40" aria-hidden="true" />
            </div>
        {/snippet}
    </RowFrame>
</div>
