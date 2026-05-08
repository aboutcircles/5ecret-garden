<script lang="ts">
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import Icon from '$lib/design-system/Icon.svelte';
    import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
    import type { Address } from '@circles-sdk/utils';
    import { T } from '$lib/design-system/tokens.js';
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
    class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    style="
        display:flex;align-items:center;gap:12px;padding:14px 20px;
        min-height:64px;cursor:pointer;
        border-bottom:1px solid {T.hairlineSoft};box-sizing:border-box;
        transition:background .1s;
    "
    onkeydown={onRowKeydown}
    onclick={onRowClick}
>
    <div style="flex:1;min-width:0;">
        <Avatar
            address={address}
            {profile}
            {avatarInfo}
            view="horizontal"
            bottomInfo={trustRelation}
            showTypeInfo={false}
            clickable={false}
        />
    </div>
    {#if pillConfig}
        <span
            style="flex-shrink:0;display:inline-flex;align-items:center;padding:3px 10px;border-radius:9999px;font-size:10.5px;font-weight:580;white-space:nowrap;background:{pillConfig.bg};color:{pillConfig.color};"
        >{pillConfig.label}</span>
    {/if}
    <Icon name="chevronRight" size={14} stroke={T.inkFaint} />
</div>
