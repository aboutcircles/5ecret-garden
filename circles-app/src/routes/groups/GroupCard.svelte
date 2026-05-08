<script lang="ts">
    import type { GroupRow } from '@circles-sdk/data';
    import { goto } from '$app/navigation';
    import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
    import { T } from '$lib/design-system/tokens.js';
    import Icon from '$lib/design-system/Icon.svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';

    interface Props {
        item: GroupRow;
        variant?: 'owned' | 'member';
        gradientIndex?: number;
    }
    let { item, variant = 'member', gradientIndex = 0 }: Props = $props();

    const gradients = [
        'linear-gradient(120deg,#FBE3D8,#F5DCE6)',
        'linear-gradient(120deg,#EEEBFA,#FBEFCB)',
        'linear-gradient(120deg,#DCEBDF,#FBEFCB)',
        'linear-gradient(120deg,#EEEBFA,#FBE3D8)',
        'linear-gradient(120deg,#FBE3D8,#FBEFCB)',
        'linear-gradient(120deg,#DCEBDF,#EEEBFA)',
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
    class="group-card"
    onclick={handleClick}
    aria-label={`Open group ${item.group}`}
    style="
        text-align:left;width:100%;padding:0;cursor:pointer;
        background:{T.surface};
        border:1px solid {T.hairlineSoft};border-radius:18px;
        overflow:hidden;box-shadow:{T.shadow.xs};
        transition:box-shadow .18s, transform .18s;
        display:flex;flex-direction:column;
    "
>
    <!-- Gradient header band -->
    <div style="height:64px;background:{gradient};position:relative;flex-shrink:0;">
        {#if variant === 'owned'}
            <span style="position:absolute;right:12px;top:12px;display:inline-flex;align-items:center;padding:3px 9px;border-radius:9999px;background:{T.ink};color:{T.butter};font-size:10.5px;font-weight:580;letter-spacing:0.02em;">Owner</span>
        {:else}
            <span style="position:absolute;right:12px;top:12px;display:inline-flex;align-items:center;padding:3px 9px;border-radius:9999px;background:{T.sageSoft};color:#1F5E37;font-size:10.5px;font-weight:580;letter-spacing:0.02em;">Member</span>
        {/if}
    </div>

    <!-- Body -->
    <div style="padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px;flex:1;">
        <Avatar
            address={item.group}
            view="horizontal"
            clickable={false}
            showTypeInfo={false}
            bottomInfo={`${item.memberCount} member${item.memberCount === 1 ? '' : 's'}`}
            placeholderAvatar={false}
            placeholderTop={true}
            placeholderBottom={true}
        />
        <div style="display:flex;align-items:center;gap:8px;margin-top:auto;padding-top:10px;border-top:1px solid {T.hairlineSoft};">
            <span style="font-size:11px;font-weight:580;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;">{variant === 'owned' ? 'Manage' : 'View'}</span>
            <div style="flex:1;"></div>
            <Icon name="chevronRight" size={14} stroke={T.inkMuted} />
        </div>
    </div>
</button>

<style>
    .group-card:hover {
        box-shadow: 0 6px 16px rgba(15,10,30,0.08), 0 1px 3px rgba(15,10,30,0.04);
        transform: translateY(-1px);
    }
</style>
