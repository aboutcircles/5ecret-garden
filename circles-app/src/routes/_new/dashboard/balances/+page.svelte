<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {onMount} from "svelte";
    import {totalBalance} from "$lib/stores/totalBalance";
    import {balances} from "$lib/stores/balances";
    import Avatar from "$lib/components/Avatar.svelte";
    import WrapCircles from "$lib/dialogs/WrapCircles.svelte";
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import UnwrapCircles from "$lib/dialogs/UnwrapCircles.svelte";
    import {ethers} from "ethers6";

    let balancesFromRpc: bigint[] = []

    onMount(async () => {
        $totalBalance = await $avatar!.getTotalBalance();
        $balances = await $avatar!.getBalances();

        const jsonRpcProvider = new ethers.JsonRpcProvider("http://localhost:8545");

        balancesFromRpc = await Promise.all($balances.map(async o => {
            try {
                // fetch the balance of the $avatar at the tokenAddress (ERC20)
                const erc20Interface = new ethers.Interface(["function balanceOf(address) view returns (uint256)"]);
                const balance = await jsonRpcProvider.call({
                    to: o.tokenAddress,
                    data: erc20Interface.encodeFunctionData("balanceOf", [$avatar!.address])
                });
                return BigInt(erc20Interface.decodeFunctionResult("balanceOf", balance).toString());
            } catch (e) {
                return -1n;
            }
        }));
    });

    let selectedRow: TokenBalanceRow | undefined;
</script>
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div></div>
    <div class="stats text-center">
        <div class="stat">
            <a href="/_new/dashboard/balances">
                <div class="stat-value">{$totalBalance.toFixed(2)} CRC</div>
                <div class="stat-desc">{$balances?.length} individual tokens</div>
            </a>
        </div>
    </div>
    <div></div>
</div>
<div class="card bg-base-100 shadow-lg p-6">
    <div class="card-title text-2xl mb-4">Balance overview</div>
    <div class="overflow-x-auto">
        <table class="table w-full">
            <thead>
            <tr>
                <th>Name</th>
                <th>Balance (Demurrage)</th>
                <th>Balance (Inflation)</th>
                <th>Type</th>
                <th>Actions</th>
            </tr>
            </thead>
            <tbody>
            {#each $balances as balance, i}
                <tr>
                    <td>
                        <p class="font-semibold">
                            <Avatar address={balance.tokenOwner}/>
                        </p>
                        <p class="text-xs text-gray-500">
                            {balance.tokenAddress}
                        </p>
                    </td>
                    <td class:text-xl={!balance.isInflationary}>{balance.circles.toFixed(2)}</td>
                    <td class:text-xl={balance.isInflationary}>{balance.staticCircles.toFixed(2)}</td>
                    <td>
                        {#if balance.isErc20}
                            <span class="badge badge-outline">ERC 20</span>
                        {:else if balance.isErc1155}
                            <span class="badge badge-outline">ERC 1155</span>
                        {/if}
                        {#if balance.isInflationary}
                            <span class="badge badge-outline">Inflation</span>
                        {:else}
                            <span class="badge badge-outline">Demurrage</span>
                        {/if}
                    </td>
                    <td>
                        {#if balance.isErc1155}
                            <button class="btn" on:click={() => selectedRow = balance} onclick="wrapModal.showModal()">
                                Wrap
                            </button>
                        {/if}
                        {#if balance.isErc20 && balance.version !== 1}
                            <button class="btn" on:click={() => selectedRow = balance}
                                    onclick="unwrapModal.showModal()">Unwrap
                            </button>
                        {/if}
                    </td>
                </tr>
            {/each}
            </tbody>
        </table>
    </div>
</div>

<WrapCircles tokenAddress={selectedRow?.tokenAddress}></WrapCircles>
<UnwrapCircles tokenAddress={selectedRow?.tokenAddress}></UnwrapCircles>