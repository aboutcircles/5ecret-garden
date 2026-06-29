<script lang="ts">
    import { T } from '$lib/design-system/tokens.js';
    import Icon from '$lib/design-system/Icon.svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
    import type { AvatarCommunity } from '$lib/areas/groups/utils/getAvatarCommunities';

    interface Props {
        item: AvatarCommunity;
        gradientIndex?: number;
    }
    let { item, gradientIndex = 0 }: Props = $props();

    const gradients = [
        'linear-gradient(120deg,#FBE3D8,#F5DCE6)',
        'linear-gradient(120deg,#EEEBFA,#FBEFCB)',
        'linear-gradient(120deg,#DCEBDF,#FBEFCB)',
        'linear-gradient(120deg,#EEEBFA,#FBE3D8)',
        'linear-gradient(120deg,#FBE3D8,#FBEFCB)',
        'linear-gradient(120deg,#DCEBDF,#EEEBFA)',
    ];
    const gradient = $derived(gradients[gradientIndex % gradients.length]);

    // Fee shown beneath the group name. `null` means the group declares no fee.
    const feeLabel = $derived(item.membershipFee == null ? 'No fee' : `${item.membershipFee}% fee`);
</script>

<button
    type="button"
    class="community-card"
    onclick={() => openProfilePopup(item.groupAddress)}
    aria-label={`Open community ${item.groupName ?? item.groupAddress}`}
    style="
        text-align:left;width:100%;padding:0;cursor:pointer;
        background:{T.surface};
        border:1px solid {T.hairlineSoft};border-radius:18px;
        overflow:hidden;box-shadow:{T.shadow.xs};
        transition:box-shadow .18s ease-out, transform .18s ease-out;
        display:flex;flex-direction:column;
    "
>
    <!-- Gradient header band with the confirmed/pending status badge -->
    <div style="height:64px;background:{gradient};position:relative;flex-shrink:0;">
        {#if item.confirmed}
            <span style="position:absolute;right:12px;top:12px;display:inline-flex;align-items:center;padding:3px 9px;border-radius:9999px;background:{T.sageSoft};color:#1F5E37;font-size:10.5px;font-weight:580;letter-spacing:0.02em;">Confirmed</span>
        {:else}
            <span style="position:absolute;right:12px;top:12px;display:inline-flex;align-items:center;padding:3px 9px;border-radius:9999px;background:{T.butterSoft};color:#7A5B12;font-size:10.5px;font-weight:580;letter-spacing:0.02em;">Pending</span>
        {/if}
    </div>

    <!-- Body -->
    <div style="padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px;flex:1;">
        <Avatar
            address={item.groupAddress}
            view="horizontal"
            clickable={false}
            showTypeInfo={false}
            bottomInfo={feeLabel}
            placeholderAvatar={false}
            placeholderTop={true}
            placeholderBottom={true}
        />
        <div style="display:flex;align-items:center;gap:8px;margin-top:auto;padding-top:10px;border-top:1px solid {T.hairlineSoft};">
            <span style="font-size:11px;font-weight:580;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;">View</span>
            <div style="flex:1;"></div>
            <Icon name="chevronRight" size={14} stroke={T.inkMuted} />
        </div>
    </div>
</button>

<style>
    .community-card:hover {
        box-shadow: 0 6px 16px rgba(15,10,30,0.08), 0 1px 3px rgba(15,10,30,0.04);
        transform: translateY(-1px);
    }
</style>
