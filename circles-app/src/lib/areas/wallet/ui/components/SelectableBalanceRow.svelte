<script lang="ts">
    import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
    import type { TokenBalanceRow } from '@aboutcircles/sdk-types';

    export type SelectableBalanceRowItem = {
        balance: TokenBalanceRow;
        onSelect: () => void;
    };

    interface Props {
        item: SelectableBalanceRowItem;
    }

    let { item }: Props = $props();

    function onSelect(): void {
        item.onSelect();
    }
</script>

<BalanceRow item={item.balance} on:click={onSelect} />
