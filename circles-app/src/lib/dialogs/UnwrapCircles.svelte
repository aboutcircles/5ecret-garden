<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {circles} from "$lib/stores/circles";
    import {ethers} from "ethers6";

    export let tokenAddress: string | undefined;
    export let amount: number = 0;
    export let maxValue: number = Number.MAX_VALUE;

    async function unwrap() {
        if (!tokenAddress) {
            return;
        }
        const tokenInfo = await $circles?.data?.getTokenInfo(tokenAddress);
        if (!tokenInfo) {
            return;
        }

        if (tokenInfo.type === "CrcV2_ERC20WrapperDeployed_Inflationary") {
            await $avatar?.unwrapInflationErc20(tokenAddress, BigInt(ethers.parseEther(amount.toString())));
        } else if (tokenInfo.type === "CrcV2_ERC20WrapperDeployed_Demurraged") {
            await $avatar?.unwrapDemurrageErc20(tokenAddress, BigInt(ethers.parseEther(amount.toString())));
        } else {
            throw new Error("Unsupported token type");
        }
    }
</script>

<dialog id="unwrapModal" class="modal">
    <div class="modal-box">
        <h3 class="text-lg font-bold">Unwrap ERC20 ({tokenAddress}) to Circles</h3>

        <!-- Form for entering the amount and selecting the wrapping type -->
        <form>
            <div class="form-control mb-4">
                <label class="label">
                    <span class="label-text">Enter amount to unwrap</span>
                </label>
                <input type="number" step="0.01" min="0" max={maxValue} placeholder="0.00" class="input input-bordered w-full" bind:value={amount}>
            </div>

            <!-- Modal action buttons -->
            <div class="modal-action">
                <button type="button" class="btn btn-outline" onclick="unwrapModal.close()">Cancel</button>
                <button type="submit" class="btn btn-primary" on:click={unwrap} >Confirm</button>
            </div>
        </form>
    </div>
</dialog>
