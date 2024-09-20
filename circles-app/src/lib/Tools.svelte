<script lang="ts">
    import * as utils from "@circles-sdk/utils";

    const tokenIdChanged = () => {
        const tokenId = document.getElementById("token-id") as HTMLInputElement;
        const address = document.getElementById("address") as HTMLInputElement;
        address.value = utils.uint256ToAddress(BigInt(tokenId.value));
    };
    const addressChanged = () => {
        const tokenId = document.getElementById("token-id") as HTMLInputElement;
        const address = document.getElementById("address") as HTMLInputElement;
        tokenId.value = utils.addressToUInt256(address.value).toString()
    }
</script>

<fieldset class="p-4 border border-gray-300 rounded-md">
    <legend class="text-lg font-semibold mb-4">Token-id &lt;-&gt; Address</legend>
    <div class="flex flex-col space-y-4">
        <!-- Token ID Input -->
        <div class="flex flex-col space-y-2">
            <label for="token-id" class="text-sm font-medium text-gray-700">Token ID</label>
            <input type="text" id="token-id" class="form-input p-2 border border-gray-300 rounded-md" on:change={tokenIdChanged}/>
        </div>

        <!-- Address Input -->
        <div class="flex flex-col space-y-2">
            <label for="address" class="text-sm font-medium text-gray-700">Address</label>
            <input type="text" id="address" class="form-input p-2 border border-gray-300 rounded-md" on:change={addressChanged}/>
        </div>
    </div>
</fieldset>
