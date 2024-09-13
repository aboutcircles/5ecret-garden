<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {onMount} from "svelte";
    import {totalBalance} from "$lib/stores/totalBalance";
    import {balances} from "$lib/stores/balances";
    import {transactionHistory, updateTransactions} from "$lib/stores/transactionHistory";
    import Avatar from "$lib/components/Avatar.svelte";
    import {getTimeAgo} from "$lib/utils/shared";

    onMount(async () => {
        $totalBalance = await $avatar!.getTotalBalance();
    });
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div></div>
    <div class="stats text-center">
        <div class="stat">
            <a href="/_new/dashboard/balances">
                <div class="stat-value">{$totalBalance?.toFixed(2)} CRC</div>
                <div class="stat-desc">{$balances?.length} individual tokens</div>
            </a>
        </div>
    </div>
    <div></div>
</div>

<div class="card bg-base-100 shadow-lg p-6">
    <div class="card-title text-2xl mb-4">Recent Transactions</div>
    <div class="overflow-x-auto">
        <table class="table w-full">
            <thead>
            <tr>
                <th>Date</th>
                <th>From/to</th>
                <th>Amount (demurrage)</th>
                <th>Amount (inflation)</th>
                <th>Type</th>
            </tr>
            </thead>
            <tbody>
            {#each ($transactionHistory ?? []) as tx(`${tx.blockNumber}-${tx.transactionIndex}-${tx.logIndex}-${tx.batchIndex ?? "0"}`)}
                <tr>
                    <td>{getTimeAgo(tx.timestamp)}</td>
                    <td>
                        <p class="font-semibold">
                            {#if tx.from === "0x0000000000000000000000000000000000000000"}
                                Mint
                            {:else if tx.to === "0x0000000000000000000000000000000000000000"}
                                Burn
                            {:else if tx.from === $avatar.address}
                                <!-- from me -->
                                <!--{tx.to}-->
                                <Avatar address={tx.to} />
                            {:else if tx.to === $avatar.address}
                                <!-- to me -->
                                <!--{tx.from}-->
                                <Avatar address={tx.from} />
                            {/if}
                        </p>
                        <p class="text-xs text-gray-500">
                            <a href={"https://gnosisscan.io/tx/" + tx.transactionHash}>
                                {tx.transactionHash}
                            </a>
                        </p>
                    </td>
                    <td class="text-lg"
                        class:text-red-500={tx.from === $avatar.address}
                        class:text-green-500={tx.to === $avatar.address}>
                        {#if tx.from === $avatar.address}
                            -
                        {/if}
                        {tx.circles?.toFixed(2)}
                    </td>
                    <td class:text-red-500={tx.from === $avatar.address}
                        class:text-green-500={tx.to === $avatar.address}>
                        {#if tx.from === $avatar.address}
                            -
                        {/if}
                        {tx.staticCircles?.toFixed(2)}
                    </td>
                    <td>
                        <span class="badge badge-outline">{tx.type}</span>
                        <span class="badge badge-outline">{tx.tokenType}</span>
                    </td>
                </tr>
            {/each}
            </tbody>
        </table>
    </div>
</div>