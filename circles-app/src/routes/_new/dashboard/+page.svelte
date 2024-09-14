<script lang="ts">
    import {balances} from "$lib/stores/balances";
    import {floorToDecimals} from "$lib/utils/shared";
    import type {TokenType} from "@circles-sdk/data";
    import TransactionList from "./TransactionList.svelte";

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
                <div class="stat-value">{floorToDecimals($balances.total.circles)} Circles</div>
                <div class="stat-desc">{$balances?.rows?.length} individual tokens</div>
            </a>
        </div>
    </div>
    <div></div>
</div>

<div class="card bg-base-100 shadow-lg p-6">
    <div class="card-title text-2xl mb-4">Recent Transactions</div>

    <TransactionList
            demurragedType={demurragedType}
            staticTypes={staticTypes}
            crcTypes={crcTypes}
    />

</div>
