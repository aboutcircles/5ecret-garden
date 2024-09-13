<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {onMount} from "svelte";
    import {totalBalance} from "$lib/stores/totalBalance";
    import {balances} from "$lib/stores/balances";
    import Avatar from "$lib/components/Avatar.svelte";
    import WrapCircles from "$lib/dialogs/WrapCircles.svelte";
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import UnwrapCircles from "$lib/dialogs/UnwrapCircles.svelte";
    import Send from "$lib/dialogs/Send.svelte";
    import {circles} from "$lib/stores/circles";
    import {floorToDecimals} from "$lib/utils/shared";

    let mintableAmount: number = 0;

    onMount(async () => {
        $totalBalance = await $avatar!.getTotalBalance();
        mintableAmount = await $avatar!.getMintableAmount();
    });

    let selectedRow: TokenBalanceRow | undefined;
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
    <div class="card-title text-2xl mb-4">Balance overview</div>
    <div class="overflow-x-auto">
        <table class="table w-full">
            <thead>
            <tr>
                <th>Name</th>
                <th>Circles</th>
                <th>Static Circles</th>
                <th>CRC</th>
                <th>Type</th>
                <th>Actions</th>
            </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <p class="font-semibold">
                            Mintable amount:
                        </p>
                    </td>
                    <td class="text-lg text-green-500">
                        {floorToDecimals(mintableAmount)}
                    </td>
                    <td colspan="3"></td>
                    <td>
                        <button class="btn"
                                on:click={() => $avatar?.personalMint()}
                                disabled={mintableAmount === 0}>
                            Mint
                        </button>
                    </td>
                </tr>
            {#each $balances as balance}
                <tr>
                    <td>
                        <p class="font-semibold">
                            <Avatar address={balance.tokenOwner}/>
                        </p>
                        <p class="text-xs text-gray-500">
                            {balance.tokenAddress}
                        </p>
                    </td>
                    <td class:text-xl={!balance.isInflationary && balance.version !== 1}>{floorToDecimals(balance.circles)}</td>
                    <td class:text-xl={balance.isInflationary && balance.version !== 1}>{floorToDecimals(balance.staticCircles)}</td>
                    <td class:text-xl={balance.isInflationary && balance.isErc20 && balance.version === 1}>{floorToDecimals(balance.crc)}</td>
                    <td>
                        <span class="badge badge-outline">{balance.tokenType}</span>
                    </td>
                    <td>
                        {#if balance.isErc1155}
                            <button class="btn"
                                    on:click={() => selectedRow = balance}
                                    onclick="wrapModal.showModal()">
                                Wrap
                            </button>
                        {/if}
                        {#if balance.isErc20 && balance.version !== 1}
                            <button class="btn"
                                    on:click={() => selectedRow = balance}
                                    onclick="unwrapModal.showModal()">Unwrap
                            </button>
                        {/if}
                        {#if $avatar?.avatarInfo?.version === 2 && (($avatar.avatarInfo.hasV1 && $avatar.avatarInfo.v1Stopped) || !$avatar.avatarInfo.hasV1) && balance.version === 1}
                            <button class="btn"
                                    on:click={() => {
                                        selectedRow = balance;
                                        $circles?.migrateV1Tokens($avatar.address, [balance?.tokenAddress]);
                                    }}>Migrate
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
