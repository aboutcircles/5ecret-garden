<script lang="ts">
    import {ethers} from "ethers6";
    import {avatar} from "$lib/stores/avatar";

    export let tokenAddress: string | undefined;
    export let receiverAddress: string | undefined;
    export let amount: number = 0;
    export let maxValue: number = Number.MAX_VALUE;

    async function wrap() {
    }
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
