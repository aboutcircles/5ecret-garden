<script lang="ts">
    import type { GroupRow } from '@circles-sdk/data';
    import ProfilePage from '$lib/pages/Profile.svelte';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import { popupControls } from '$lib/stores/popUp';
    import RowFrame from '$lib/ui/RowFrame.svelte';

    interface Props { item: GroupRow; }
    let { item }: Props = $props();

    function openProfile() {
        popupControls.open?.({ component: ProfilePage, props: { address: item.group } });
    }
</script>

<RowFrame clickable={true} dense={true} noLeading={true} on:click={openProfile}>
    <div class="min-w-0">
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

    <div slot="trailing" aria-hidden="true">
        <img src="/chevron-right.svg" alt="" class="h-4 w-4 opacity-70" />
    </div>
</RowFrame>
