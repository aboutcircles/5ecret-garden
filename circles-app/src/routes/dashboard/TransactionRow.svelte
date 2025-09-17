<script lang="ts">
    import { getTimeAgo } from '$lib/utils/shared';
    import type { TransactionHistoryRow } from '@circles-sdk/data';
    import Avatar from '$lib/components/avatar/Avatar.svelte';
    import { avatarState } from '$lib/stores/avatar.svelte';

    interface Props { item: TransactionHistoryRow; }
    let { item }: Props = $props();

    let tags: string = $state('');
    let netCircles = $state(0);
    let counterpartyAddress = $state('');
    let badgeUrl: string | null = $state(null);
    let displayAmount = $state('');

    function parseEventDetails(eventsJson: string) {
        let parsed: any[];
        try { parsed = JSON.parse(eventsJson) || []; }
        catch (err) { console.error('Failed to parse item.events:', err); parsed = []; }
        const relevantTypes = new Set([
            'CrcV1_Transfer','CrcV2_PersonalMint','CrcV2_DiscountCost','CrcV2_GroupMint',
            'CrcV2_StreamCompleted','CrcV2_WithdrawDemurraged','CrcV2_WithdrawInflationary',
            'CrcV2_DepositDemurraged','CrcV2_DepositInflationary',
            'CrcV2_CollateralLockedBatch','CrcV2_CollateralLockedSingle','CrcV2_GroupRedeem',
        ]);
        const tags: string[] = [];
        for (const e of parsed) {
            if (relevantTypes.has(e.$type) && !tags.includes(e.$type)) tags.push(e.$type);
        }
        return { tags };
    }

    function getCounterpartyAddress(avatarAddress: string) {
        const zero = '0x0000000000000000000000000000000000000000';
        const lowerFrom = item.from.toLowerCase();
        const lowerTo = item.to.toLowerCase();
        const lowerAvatar = avatarAddress.toLowerCase();
        const isMint = item.from === zero;
        const isBurn = item.to === zero;
        if (isMint) return lowerTo;
        if (isBurn) return lowerAvatar;
        if (lowerFrom === lowerAvatar) return lowerTo;
        return lowerFrom;
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
        if (abs < 0.01) return '< 0.01';
        return abs.toFixed(2);
    }

    $effect(() => {
        if (!avatarState.avatar) return;
        const result = parseEventDetails(item.events);
        tags = result.tags.join(', ');
        netCircles = item.circles;

        counterpartyAddress = getCounterpartyAddress(avatarState.avatar.address);
        badgeUrl = getBadge(avatarState.avatar.address);

        const sent = item.from.toLowerCase() === avatarState.avatar.address.toLowerCase();
        const prefix = sent ? '-' : '+';
        displayAmount = `${prefix}${formatNetCircles(netCircles)}`;
    });
</script>

<a
        class="flex items-center justify-between p-2 hover:bg-base-200 rounded-lg"
        target="_blank"
        href={'https://gnosisscan.io/tx/' + item.transactionHash}
>
    {#if avatarState.avatar}
        <div>
            <Avatar
                    address={counterpartyAddress}
                    view="horizontal"
                    pictureOverlayUrl={badgeUrl}
                    topInfo={tags}
                    bottomInfo={getTimeAgo(item.timestamp)}
            />
        </div>
        <div class="text-right">
            {#if item.from.toLowerCase() === avatarState.avatar.address.toLowerCase()}
                <span class="text-error font-bold">{displayAmount}</span> CRC
            {:else}
                <span class="text-success font-bold">{displayAmount}</span> CRC
            {/if}
        </div>
    {:else}
        <p>Loading avatar info...</p>
    {/if}
</a>
