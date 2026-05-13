<script lang="ts">
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
    import type { Address } from '@circles-sdk/utils';
    import { createKeyboardListNavigator } from '$lib/shared/ui/lists/utils/keyboardListNavigator';
    import { T } from '$lib/design-system/tokens.js';

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
    style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;background:{T.surface};border:1px solid {T.hairlineSoft};cursor:pointer;width:100%;box-sizing:border-box;outline:none;transition:background 180ms ease-out, border-color 180ms ease-out;"
    onkeydown={onRowKeydown}
    onclick={onRowClick}
>
    <div style="flex:1;min-width:0;">
        <Avatar address={item} view="horizontal" clickable={true} showTypeInfo={true} />
    </div>
    <div aria-hidden="true">
        <img src="/chevron-right.svg" alt="" style="width:16px;height:16px;opacity:0.7;" aria-hidden="true" />
    </div>
</div>

<style>
  [data-trust-relation-row]:hover,
  [data-trust-relation-row]:focus-visible {
    background: #F6F5F2 !important;
    border-color: rgba(31,17,70,0.12) !important;
  }
</style>
