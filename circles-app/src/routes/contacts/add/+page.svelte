<script lang="ts">
    import {goto} from "$app/navigation";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {ethers} from "ethers";
    import {avatar} from "$lib/stores/avatar";

    let trustAddress = "";

    async function trust() {
        await $avatar?.trust(trustAddress);
        await goto("/contacts");
    }

    $: trustAddressIsValid = ethers.isAddress(trustAddress);
</script>

<div class="space-y-6">
    <div class="bg-white p-4 rounded shadow">
        <h2 class="text-lg font-medium">Trust someone</h2>
        <div class="mt-3 space-y-2">
            <div>
                <label for="circlesAddress" class="block text-sm font-medium text-gray-700">Circles address</label>
                <input bind:value={trustAddress}
                       type="text" id="circlesAddress"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                       placeholder="0x.....">
            </div>
            <ActionButton action={trust} disabled={!trustAddressIsValid}>
                Trust
            </ActionButton>
        </div>
    </div>
</div>
