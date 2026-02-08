<script lang="ts">
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
import { ProfilePopup } from '$lib/domains/profile/ui/pages';
    import { popupControls } from '$lib/shared/state/popup';
    import RowFrame from '$lib/shared/ui/RowFrame.svelte';
    import type { Address } from '@circles-sdk/utils';

    interface Props { address?: Address; trustRelation?: string; }
    let { address, trustRelation = '' }: Props = $props();

    function openProfile() {
        if (!address) return;
        popupControls.open?.({ component: ProfilePopup, props: { address } });
    }
</script>

<RowFrame clickable={true} dense={true} noLeading={true} onclick={openProfile}>
    <div class="min-w-0">
        <Avatar
            address={address}
            view="horizontal"
            bottomInfo={trustRelation}
            showTypeInfo={true}
            clickable={true}
        />
    </div>
    {#snippet trailing()}<div aria-hidden="true">
        <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" aria-hidden="true" />
    </div>{/snippet}
</RowFrame>
