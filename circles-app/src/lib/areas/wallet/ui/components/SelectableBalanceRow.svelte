<script lang="ts">
    import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
    import type { TokenBalance } from '@aboutcircles/sdk-types';

    export type SelectableBalanceRowItem = {
        balance: TokenBalance;
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

<BalanceRow item={item.balance as any} onclick={onSelect} />
