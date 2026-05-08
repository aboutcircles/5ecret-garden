<script lang="ts">
    import { derived, writable } from 'svelte/store';
    import VirtualList from '$lib/shared/ui/lists/VirtualList.svelte';
    import TransactionRow from './TransactionRow.svelte';
    import TransactionRowPlaceholder from '$lib/shared/ui/lists/placeholders/TransactionRowPlaceholder.svelte';
    import { transactionHistory } from '$lib/shared/state/transactionHistory';
    import { avatarState } from '$lib/shared/state/avatar.svelte';

    interface Props {
        filter?: 'all' | 'received' | 'sent' | 'mints';
    }
    let { filter = 'all' }: Props = $props();

    const TRANSACTION_ROW_HEIGHT = 76;
    let transactionsListScopeEl: HTMLDivElement | null = $state(null);

    const ZERO = '0x0000000000000000000000000000000000000000';

    // Bridge rune props to svelte stores so we can use them in derived()
    const filterStore = writable<string>(filter);
    $effect(() => { filterStore.set(filter); });

    const avatarAddrStore = writable<string | null>(
        avatarState.avatar?.address?.toLowerCase() ?? null
    );
    $effect(() => { avatarAddrStore.set(avatarState.avatar?.address?.toLowerCase() ?? null); });

    const filteredHistory = derived(
        [transactionHistory, filterStore, avatarAddrStore],
        ([$th, $f, $addr]) => {
            if ($f === 'all') return $th;
            return {
                ...$th,
                data: $th.data.filter((item) => {
                    const isMint = item.from === ZERO;
                    if ($f === 'mints') return isMint;
                    if (!$addr) return false;
                    const fromMe = item.from.toLowerCase() === $addr;
                    const toMe = item.to.toLowerCase() === $addr;
                    if ($f === 'sent') return !isMint && fromMe;
                    if ($f === 'received') return !isMint && toMe && !fromMe;
                    return true;
                }),
            };
        }
    );
</script>

<div
    data-transactions-list-scope
    bind:this={transactionsListScopeEl}
    style={`--transaction-row-height: ${TRANSACTION_ROW_HEIGHT}px;`}
>
    <VirtualList
        row={TransactionRow}
        store={filteredHistory}
        rowHeight={TRANSACTION_ROW_HEIGHT}
        maxPlaceholderPages={2}
        expectedPageSize={25}
        eagerLoadMultiplier={2}
        placeholderRow={TransactionRowPlaceholder}
    />
</div>
