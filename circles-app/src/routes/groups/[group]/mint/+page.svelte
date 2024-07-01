<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import AssetPicker from "$lib/components/AssetPicker.svelte";
    import type {GroupRow, TokenBalanceRow} from "@circles-sdk/data";
    import {onMount} from "svelte";
    import {avatar} from "$lib/stores/avatar";
    import {circles} from "$lib/stores/circles";
    import {page} from "$app/stores";
    import {ethers} from "ethers";

    let group: GroupRow;
    let balances: TokenBalanceRow[] = [];
    let selectedCollateral: string | undefined;
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
        selectedCollateral = balances.find(b => b.tokenOwner === $avatar?.address)?.tokenOwner;
    });

    async function mintGroupToken() {
        if (!selectedCollateral || !mintAmount) {
            return;
        }
        const collateral = [selectedCollateral];
        const amounts = [ethers.parseEther(mintAmount)];
        const data = Uint8Array.of(0);

        await $avatar?.groupMint(group.group, collateral, amounts, data);
    }
</script>

<div class="space-y-6">
    <div class="bg-white p-4 rounded shadow">
        <h2 class="text-lg font-medium">Mint {group?.name} ({group?.symbol}) tokens</h2>
        <div class="mt-3 space-y-2">
            <AssetPicker {balances} bind:selectedCollateral/>
            <div>
                <label for="mintAmount" class="block text-sm font-medium text-gray-700">Amount</label>
                <input bind:value={mintAmount}
                       type="text" id="mintAmount"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                       placeholder="11.90">
            </div>
            <ActionButton action={mintGroupToken} disabled={false}>
                Mint
            </ActionButton>
        </div>
    </div>
</div>
