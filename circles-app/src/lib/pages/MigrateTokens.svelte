<script lang="ts">
    import { circles } from "$lib/stores/circles";
    import BalanceRow from "$lib/components/BalanceRow.svelte";
    import { avatar } from "$lib/stores/avatar";
    import type { TokenBalanceRow } from "@circles-sdk/data";
    import type { PopupContentApi } from "$lib/components/PopUp.svelte";
    import { runTask } from "../../routes/+layout.svelte";
    import { tokenTypeToString } from "$lib/pages/SelectAsset.svelte";
    import { onMount } from 'svelte';

    export let contentApi: PopupContentApi;
    export let asset: TokenBalanceRow;

    let amountToMigrate: number = 0; // New variable to hold the migration amount

    // Limit the amount to the user's balance
    let maxAmount: number = 0;

    onMount(async () => {
        maxAmount = asset.balance; // Initialize maxAmount with the user's token balance
    });

    async function migrate() {
        if (!$circles || !$avatar) {
            return;
        }

        const tokenInfo = await $circles?.data?.getTokenInfo(asset.tokenAddress);
        if (!tokenInfo) {
            return;
        }
        if (tokenInfo.version !== 1) {
            throw new Error(`Token ${tokenInfo.token} is not a v1 token and can't be migrated.`);
        }

        // Validate amount
        if (amountToMigrate <= 0 || amountToMigrate > maxAmount) {
            throw new Error(`Invalid amount. Please enter a value between 1 and ${maxAmount}.`);
        }

        // Manually call `migrateV1TokensBatch` for migration
        runTask({
            name: `Migrate ${tokenTypeToString(asset.tokenType)} to v2...`,
            promise: $circles.migrateV1TokensBatch($avatar.address, [asset.tokenAddress], amountToMigrate) // Migrating specific amount of tokens
        });

        contentApi.close();
    }
</script>

<div class="p-6 pt-0">
    <div class="form-control mb-4">
        <p class="menu-title pl-0">
            Token
        </p>
        <BalanceRow balance={asset} />
    </div>

    <div class="form-control mb-4">
        <p class="menu-title pl-0">
            Amount to Migrate
        </p>
        <input 
            type="number" 
            min="1" 
            max={maxAmount} 
            bind:value={amountToMigrate} 
            class="input" 
            placeholder="Enter amount"
            required
        />
    </div>

    <div class="modal-action">
        <button type="submit" class="btn btn-primary" on:click={migrate}>Migrate</button>
    </div>
</div>
