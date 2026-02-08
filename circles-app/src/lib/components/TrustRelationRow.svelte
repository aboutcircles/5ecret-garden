<script lang="ts">
    import RowFrame from '$lib/shared/ui/RowFrame.svelte';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import ProfilePage from '$lib/domains/profile/ui/pages/ProfilePopup.svelte';
    import { popupControls } from '$lib/shared/state/popup';
    import type { Address } from '@circles-sdk/utils';

    interface Props {
        item: Address;
    }

    let { item }: Props = $props();

    function openProfile(addr: Address): void {
        popupControls.open({ component: ProfilePage, props: { address: addr } });
    }
</script>

<RowFrame clickable={true} dense={true} noLeading={true} onclick={() => openProfile(item)}>
    <div class="min-w-0">
        <Avatar address={item} view="horizontal" clickable={true} showTypeInfo={true} />
    </div>
    {#snippet trailing()}<div aria-hidden="true">
        <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" aria-hidden="true" />
    </div>{/snippet}
</RowFrame>