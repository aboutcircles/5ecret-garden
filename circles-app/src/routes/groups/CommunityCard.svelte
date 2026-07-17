<script lang="ts">
    import { T } from '$lib/design-system/tokens.js';
    import Icon from '$lib/design-system/Icon.svelte';
    import Avatar from '$lib/shared/ui/avatar/Avatar.svelte';
    import { openProfilePopup } from '$lib/shared/ui/profile/openProfilePopup';
    import type { AvatarCommunity } from '$lib/areas/groups/utils/getAvatarCommunities';
    import { leaveCommunity, isAffiliateRegistryAvailable } from '$lib/areas/groups/utils/affiliateGroupActions';

    interface Props {
        item: AvatarCommunity;
        gradientIndex?: number;
        /** Called after a successful leave so the parent can refresh its list. */
        onLeave?: () => void | Promise<void>;
    }
    let { item, gradientIndex = 0, onLeave }: Props = $props();

    let leaving: boolean = $state(false);
    const canLeave = $derived(isAffiliateRegistryAvailable());

    const gradients = [
        'linear-gradient(120deg,#FBE3D8,#F5DCE6)',
        'linear-gradient(120deg,#EEEBFA,#FBEFCB)',
        'linear-gradient(120deg,#DCEBDF,#FBEFCB)',
        'linear-gradient(120deg,#EEEBFA,#FBE3D8)',
        'linear-gradient(120deg,#FBE3D8,#FBEFCB)',
        'linear-gradient(120deg,#DCEBDF,#EEEBFA)',
    ];
    const gradient = $derived(gradients[gradientIndex % gradients.length]);

    // Fee shown beneath the community name. `null` means the community declares no fee.
    const feeLabel = $derived(item.membershipFee == null ? 'No fee' : `${item.membershipFee}% fee`);

    function open() {
        openProfilePopup(item.communityAddress);
    }

    function onKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
        }
    }

    async function handleLeave(event: MouseEvent) {
        event.stopPropagation();
        if (leaving) return;
        leaving = true;
        try {
            await leaveCommunity(item.communityAddress);
            await onLeave?.();
        } catch (e) {
            // The task runner surfaces the failure; keep the card interactive.
            console.error('Failed to leave community', e);
        } finally {
            leaving = false;
        }
    }
</script>

<div
    role="button"
    tabindex={0}
    class="community-card"
    onclick={open}
    onkeydown={onKeydown}
    aria-label={`Open community ${item.communityName ?? item.communityAddress}`}
    style="
        text-align:left;width:100%;cursor:pointer;
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
            address={item.communityAddress}
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
            {#if canLeave}
                <button
                    type="button"
                    onclick={handleLeave}
                    disabled={leaving}
                    aria-label={`Leave community ${item.communityName ?? item.communityAddress}`}
                    style="
                        height:28px;padding:0 12px;border-radius:9999px;cursor:pointer;
                        background:transparent;color:#C44430;border:1px solid rgba(196,68,48,0.3);
                        font-family:{T.fontSans};font-size:11.5px;font-weight:560;
                        opacity:{leaving ? 0.6 : 1};
                    "
                >
                    {leaving ? 'Leaving…' : 'Leave'}
                </button>
            {:else}
                <Icon name="chevronRight" size={14} stroke={T.inkMuted} />
            {/if}
        </div>
    </div>
</div>

<style>
    .community-card:hover {
        box-shadow: 0 6px 16px rgba(15,10,30,0.08), 0 1px 3px rgba(15,10,30,0.04);
        transform: translateY(-1px);
    }
</style>
