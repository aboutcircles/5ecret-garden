<script lang="ts">
    import RowFrame from '$lib/shared/ui/primitives/RowFrame.svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
import { ProfilePopup as ProfilePage } from '$lib/domains/profile/ui/pages';
    import { popupControls } from '$lib/shared/state/popup';
    import type { Address } from '@circles-sdk/utils';

    interface Props {
        item: Address;
    }

    let { item }: Props = $props();

    function openProfile(addr: Address): void {
        popupControls.open({ component: ProfilePage, props: { address: addr } });
    }

    function focusSearchInput(current: HTMLElement): void {
        const scope = current.closest<HTMLElement>('[data-profile-relations-list-scope]');
        const input = scope?.querySelector<HTMLInputElement>('[data-profile-relations-search-input]');
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
            openProfile(item);
            return;
        }

        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

        const scope = current.closest<HTMLElement>('[data-profile-relations-list-scope]');
        const rows = Array.from((scope ?? document).querySelectorAll<HTMLElement>('[data-trust-relation-row]'));
        const index = rows.indexOf(current);
        if (index === -1) return;

        event.preventDefault();

        if (event.key === 'ArrowUp' && index === 0) {
            focusSearchInput(current);
            return;
        }

        const nextIndex = event.key === 'ArrowDown' ? index + 1 : index - 1;
        if (nextIndex < 0 || nextIndex >= rows.length) return;
        rows[nextIndex]?.focus();
    }

    function onRowClick(event: MouseEvent): void {
        const current = event.currentTarget as HTMLElement | null;
        current?.focus();
        openProfile(item);
    }
</script>

<div
    data-trust-relation-row
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