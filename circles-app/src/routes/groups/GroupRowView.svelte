<script lang="ts">
    import type { GroupRow } from '@circles-sdk/data';
    import ProfilePopup from '$lib/domains/profile/ui/pages/ProfilePopup.svelte';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import { popupControls } from '$lib/shared/state/popup';
    import RowFrame from '$lib/shared/ui/RowFrame.svelte';

    interface Props { item: GroupRow; }
    let { item }: Props = $props();

    function openProfile() {
        popupControls.open?.({ component: ProfilePopup, props: { address: item.group } });
    }
</script>

<RowFrame clickable={true} dense={true} noLeading={true} onclick={openProfile}>
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

{#snippet trailing()}<div aria-hidden="true">
        <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" />
    </div>{/snippet}
</RowFrame>
