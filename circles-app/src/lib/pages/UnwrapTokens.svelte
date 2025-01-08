<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {circles} from "$lib/stores/circles";
    import {ethers} from "ethers6";
    import BalanceRow from "$lib/components/BalanceRow.svelte";
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import {roundToDecimals} from "$lib/utils/shared";
    import { runTask } from '$lib/utils/tasks';
    import type {PopupContentApi} from "$lib/components/PopUp.svelte";

    export let contentApi: PopupContentApi;
    export let asset: TokenBalanceRow;

    let amount: number = 0;

    async function unwrap() {
        const tokenInfo = await $circles?.data?.getTokenInfo(asset.tokenAddress);
        if (!tokenInfo) {
            return;
        }
        if (!$avatar) {
            throw new Error("Avatar not loaded");
        }

        if (tokenInfo.type === "CrcV2_ERC20WrapperDeployed_Inflationary") {
            runTask({
                name: `Unwrap ${roundToDecimals(amount)} static tokens ...`,
                promise: $avatar.unwrapInflationErc20(asset.tokenAddress, BigInt(ethers.parseEther(amount.toString())))
            });
        } else if (tokenInfo.type === "CrcV2_ERC20WrapperDeployed_Demurraged") {
            runTask({
                name: `Unwrap ${roundToDecimals(amount)} tokens ...`,
                promise: $avatar.unwrapDemurrageErc20(asset.tokenAddress, BigInt(ethers.parseEther(amount.toString())))
            });
        } else {
            throw new Error("Unsupported token type");
        }
        contentApi.close();
    }
</script>

<div class="p-6 pt-0">
    <div class="form-control mb-4">
        <p class="menu-title pl-0">
            Token
        </p>
        <BalanceRow balance={asset}/>
    </div>

    <div class="form-control mb-4">
        <p class="menu-title pl-0">
            Amount
        </p>
        <input type="number" step="0.01" min="0" max={asset.circles} placeholder="0.00"
               class="input input-bordered w-full" bind:value={amount}>
    </div>

    <div class="modal-action">
        <button type="submit" class="btn btn-primary" on:click={unwrap}>Unwrap</button>
    </div>
</div>
