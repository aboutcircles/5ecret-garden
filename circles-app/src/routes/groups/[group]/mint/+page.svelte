<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import type {GroupRow, TokenBalanceRow} from "@circles-sdk/data";
    import {onMount} from "svelte";
    import {avatar} from "$lib/stores/avatar";
    import {circles} from "$lib/stores/circles";
    import {page} from "$app/stores";

    let group: GroupRow;
    let balances: TokenBalanceRow[] = [];
    let selectedCollateral: string;
    let mintAmount: string;

    onMount(async () => {
        const groupQuery = $circles?.data.findGroups(1, {
            groupAddressIn: [$page.params.group]
        });
        const groupResult = await groupQuery?.getSingleRow();
        if (groupResult) {
            group = groupResult;
        }
        if ($avatar?.address && $circles) {
            balances = await $circles.data.getTokenBalancesV2($avatar?.address);
        }
    });

    async function mintGroupToken() {
        const collateral = [selectedCollateral];
        const amounts = [BigInt(mintAmount)];
        const data = Uint8Array.of(0);

        await $avatar?.groupMint(group.group, collateral, amounts, data);
    }
</script>

<div class="space-y-6">
    <div class="bg-white p-4 rounded shadow">
        <h2 class="text-lg font-medium">Mint {group?.name} ({group?.symbol}) tokens</h2>
        <div class="mt-3 space-y-2">
            <div>
                <label for="collateral" class="block text-sm font-medium text-gray-700">Collateral</label>
                <select id="collateral" bind:value={selectedCollateral}>
                    {#each balances ?? [] as balance}
                        <option value={balance.token}>{balance.token}: {balance.balance}</option>
                    {/each}
                </select>
            </div>
            <div>
                <label for="mintAmount" class="block text-sm font-medium text-gray-700">Name</label>
                <input bind:value={mintAmount}
                       type="text" id="mintAmount"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                       placeholder="1000000">
            </div>
            <ActionButton action={mintGroupToken}
                          disabled={false}>
                Create
            </ActionButton>
        </div>
    </div>
</div>
