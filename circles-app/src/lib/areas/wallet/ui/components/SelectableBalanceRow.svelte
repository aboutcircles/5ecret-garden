<script lang="ts">
    import BalanceRow from '$lib/areas/wallet/ui/components/BalanceRow.svelte';
    import type { TokenBalanceRow } from '@circles-sdk/data';

    export type SelectableBalanceRowItem = {
        balance: TokenBalanceRow;
        onSelect: () => void;
    };

    interface Props {
        item: SelectableBalanceRowItem;
    }

    let { item }: Props = $props();
</script>

<!-- Wrap to ensure click is caught at the DOM boundary (BalanceRow doesn't emit a component 'click') -->
<button
        type="button"
        class="w-full text-left bg-transparent border-0 p-0"
        onclick={item.onSelect}
>
    <BalanceRow item={item.balance} />
</button>
