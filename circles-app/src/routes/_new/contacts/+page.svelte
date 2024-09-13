<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {onMount} from "svelte";
    import {totalBalance} from "$lib/stores/totalBalance";
    import {balances} from "$lib/stores/balances";
    import {getTimeAgo} from "$lib/utils/shared";
    import {contactList} from "$lib/stores/contactList";

    onMount(async () => {
        $totalBalance = await $avatar!.getTotalBalance();
        $balances = await $avatar!.getBalances();
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
            {#each $contactList as tx}
                <tr>
                    <td>{getTimeAgo(tx.timestamp)}</td>
                </tr>
            {/each}
            </tbody>
        </table>
    </div>
</div>