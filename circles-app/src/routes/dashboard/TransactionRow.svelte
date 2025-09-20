<script lang="ts">
    import { getTimeAgo } from '$lib/utils/shared';
    import type { TransactionHistoryRow } from '@circles-sdk/data';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import { avatarState } from '$lib/stores/avatar.svelte';
    import RowFrame from '$lib/ui/RowFrame.svelte';

    interface Props { item: TransactionHistoryRow; }
    let { item }: Props = $props();

    let counterpartyAddress = $state('');
    let badgeUrl: string | null = $state(null);
    let displayAmount = $state('');
    let sent = $state(false);

    function getCounterpartyAddress(avatarAddress: string) {
        const zero = '0x0000000000000000000000000000000000000000';
        const lowerFrom = item.from.toLowerCase();
        const lowerTo = item.to.toLowerCase();
        const lowerAvatar = avatarAddress.toLowerCase();
        if (item.from === zero) return lowerTo;     // mint
        if (item.to === zero) return lowerAvatar;   // burn
        return lowerFrom === lowerAvatar ? lowerTo : lowerFrom;
    }

    function getBadge(avatarAddress: string) {
        const zero = '0x0000000000000000000000000000000000000000';
        const lowerFrom = item.from.toLowerCase();
        const lowerTo = item.to.toLowerCase();
        const lowerAvatar = avatarAddress.toLowerCase();
        if (item.from === zero) return '/badge-mint.svg';
        if (item.to === zero) return '/badge-burn.svg';
        if (lowerFrom === lowerAvatar) return '/badge-sent.svg';
        if (lowerTo === lowerAvatar) return '/badge-received.svg';
        return null;
    }

    function formatNetCircles(amount: number): string {
        const abs = Math.abs(amount);
        return abs < 0.01 ? '< 0.01' : abs.toFixed(2);
    }

    function openTx() {
        const url = 'https://gnosisscan.io/tx/' + item.transactionHash;
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    $effect(() => {
        if (!avatarState.avatar) return;
        counterpartyAddress = getCounterpartyAddress(avatarState.avatar.address);
        badgeUrl = getBadge(avatarState.avatar.address);
        sent = item.from.toLowerCase() === avatarState.avatar.address.toLowerCase();
        const prefix = sent ? '-' : '+';
        displayAmount = `${prefix}${formatNetCircles(item.circles)}`;
    });
</script>

<!-- One cohesive horizontal block inside content; collapse RowFrame leading -->
<RowFrame clickable={true} dense={true} noLeading={true} on:click={openTx}>
    <div class="w-full flex items-center justify-between">
        <div class="min-w-0">
            <Avatar
                    address={counterpartyAddress}
                    view="horizontal"
                    clickable={false}
                    pictureOverlayUrl={badgeUrl ?? undefined}
                    topInfo={''}
                    bottomInfo={getTimeAgo(item.timestamp)}
            />
        </div>

        <div class="text-right shrink-0">
            {#if sent}
                <span class="text-error font-bold">{displayAmount}</span>
            {:else}
                <span class="text-success font-bold">{displayAmount}</span>
            {/if}
            <span> CRC</span>
        </div>
    </div>
</RowFrame>
