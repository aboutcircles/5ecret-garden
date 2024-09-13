<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {onMount} from "svelte";
    import {totalBalance} from "$lib/stores/totalBalance";
    import {balances} from "$lib/stores/balances";
    import {transactionHistory, updateTransactions} from "$lib/stores/transactionHistory";
    import Avatar from "$lib/components/Avatar.svelte";
    import {floorToDecimals, getTimeAgo} from "$lib/utils/shared";
    import type {CirclesEventType} from "../../../../../../../temp/circles-sdk/packages/data";
    import type {TokenType} from "@circles-sdk/data";

    onMount(async () => {
        $totalBalance = await $avatar!.getTotalBalance();
    });

    const staticTypes: Set<TokenType> = new Set([
        "CrcV2_ERC20WrapperDeployed_Inflationary"
    ]);

    const crcTypes: Set<TokenType> = new Set([
        "CrcV1_Signup"
    ]);

    const demurragedType: Set<TokenType> = new Set([
        "CrcV2_ERC20WrapperDeployed_Demurraged",
        "CrcV2_RegisterGroup",
        "CrcV2_RegisterHuman"
    ]);
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div></div>
    <div class="stats text-center">
        <div class="stat">
            <a href="/_new/dashboard/balances">
                <div class="stat-value">{floorToDecimals($totalBalance)} CRC</div>
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
                <th>Circles</th>
                <th>Static Circles</th>
                <th>CRC</th>
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
                    <td class:text-lg={demurragedType.has(tx.tokenType)}
                        class:text-red-500={demurragedType.has(tx.tokenType) && tx.from === $avatar.address}
                        class:text-green-500={demurragedType.has(tx.tokenType) && tx.to === $avatar.address}>
                        {floorToDecimals(tx.circles)}
                    </td>
                    <td class:text-lg={staticTypes.has(tx.tokenType)}
                        class:text-red-500={staticTypes.has(tx.tokenType) && tx.from === $avatar.address}
                        class:text-green-500={staticTypes.has(tx.tokenType) && tx.to === $avatar.address}>
                        {floorToDecimals(tx.staticCircles)}
                    </td>
                    <td class:text-lg={crcTypes.has(tx.tokenType)}
                        class:text-red-500={crcTypes.has(tx.tokenType) && tx.from === $avatar.address}
                        class:text-green-500={crcTypes.has(tx.tokenType) && tx.to === $avatar.address}>
                        {floorToDecimals(tx.crc)}
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