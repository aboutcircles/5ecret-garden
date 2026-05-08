<script lang="ts">
    import type { GroupRow } from '@circles-sdk/data';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { goto } from '$app/navigation';
    import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';

    interface Props {
        item: GroupRow;
        variant?: 'owned' | 'member';
        gradientIndex?: number;
    }

    let { item, variant = 'member', gradientIndex = 0 }: Props = $props();

    const gradients = [
        'linear-gradient(135deg,#EEEBFA 0%,#FBE3D8 100%)',
        'linear-gradient(135deg,#FBE3D8 0%,#FBEFCB 100%)',
        'linear-gradient(135deg,#DCEBDF 0%,#EEEBFA 100%)',
        'linear-gradient(135deg,#FBEFCB 0%,#DCEBDF 100%)',
    ];

    const gradient = $derived(gradients[gradientIndex % gradients.length]);

    function handleClick() {
        if (variant === 'owned') {
            goto(`/groups/members/${item.group}`);
        } else {
            openProfilePopup(item.group);
        }
    }
</script>

<button
    type="button"
    class="text-left w-full rounded-[16px] bg-base-100 border border-base-300 overflow-hidden cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    onclick={handleClick}
    aria-label={`Open group ${item.group}`}
>
    <!-- Gradient header band -->
    <div class="h-[44px] w-full" style="background:{gradient};"></div>

    <!-- Content below band -->
    <div class="px-3 pb-3 pt-2">
        <Avatar
            address={item.group}
            view="horizontal"
            clickable={false}
            showTypeInfo={false}
            bottomInfo={`${item.memberCount} member${item.memberCount === 1 ? '' : 's'}`}
            placeholderAvatar={true}
            placeholderTop={true}
            placeholderBottom={true}
        />
    </div>
</button>
