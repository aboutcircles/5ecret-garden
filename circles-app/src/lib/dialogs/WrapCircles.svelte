<script lang="ts">
    import {ethers} from "ethers6";
    import {avatar} from "$lib/stores/avatar";

    export let tokenAddress: string | undefined;
    export let wrapType: 'Static' | 'Demurraged' = 'Static';
    export let amount: number = 0;
    export let maxValue: number = Number.MAX_VALUE;

    async function wrap() {
        const sendValue = ethers.parseEther(amount.toString());
        if (wrapType == 'Demurraged') {
            await wrapDemurraged(sendValue);
        } else {
            await wrapInflationary(sendValue);
        }
    }

    async function wrapInflationary(sendValue: bigint) {
        if ($avatar?.avatarInfo?.version !== 2) {
            throw new Error("Only supported for Avatar v2");
        }
        if (!tokenAddress) {
            return;
        }
        const receipt = await $avatar?.wrapInflationErc20(tokenAddress, sendValue);
        console.log("Wrap receipt:", receipt);
    }

    async function wrapDemurraged(sendValue: bigint) {
        if ($avatar?.avatarInfo?.version !== 2) {
            throw new Error("Only supported for Avatar v2");
        }
        if (!tokenAddress) {
            return;
        }
        const receipt = await $avatar?.wrapDemurrageErc20(tokenAddress, sendValue);
        console.log("Wrap receipt:", receipt);
    }

    $: console.log("wrapType", wrapType);
</script>

<dialog id="wrapModal" class="modal">
    <div class="modal-box">
        <h3 class="text-lg font-bold">Wrap Circles ({tokenAddress}) as ERC20</h3>

        <!-- Form for entering the amount and selecting the wrapping type -->

        <div class="form-control mb-4">
            <label class="label">
                <span class="label-text">Enter amount to wrap</span>
            </label>
            <input type="number" step="0.01" min="0" max={maxValue} placeholder="0.00"
                   class="input input-bordered w-full" bind:value={amount}>
        </div>

        <div class="form-control mb-4">
            <label class="label">
                <span class="label-text">Wrapper type:</span>
            </label>
            <div class="flex space-x-4">
                <label class="cursor-pointer flex items-center">
                    <input type="radio" name="wrapType" value="Static" bind:group={wrapType}
                           class="radio radio-primary"/>
                    <span class="ml-2">Static</span>
                </label>
                <label class="cursor-pointer flex items-center">
                    <input type="radio" name="wrapType" value="Demurraged" bind:group={wrapType}
                           class="radio radio-primary"/>
                    <span class="ml-2">Demurraged</span>
                </label>
            </div>
        </div>

        <!-- Modal action buttons -->
        <div class="modal-action">
            <button type="button" class="btn btn-outline" onclick="wrapModal.close()">Cancel</button>
            <button type="submit" class="btn btn-primary" on:click={wrap}>Confirm</button>
        </div>

    </div>
</dialog>
