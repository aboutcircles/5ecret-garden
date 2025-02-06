<script lang="ts">
    import {circles} from "$lib/stores/circles";
    import BalanceRow from "$lib/components/BalanceRow.svelte";
    import {avatar} from "$lib/stores/avatar";
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import { runTask } from '$lib/utils/tasks';
    import {tokenTypeToString} from "$lib/pages/SelectAsset.svelte";
  import { popupControls } from "$lib/stores/popUp";
    export let asset: TokenBalanceRow;

    async function migrate() {
        if (!$circles || !$avatar) {
            return;
        }

        const tokenInfo = await $circles?.data?.getTokenInfo(asset.tokenAddress);
        if (!tokenInfo) {
            return;
        }
        if (tokenInfo.version !== 1) {
            throw new Error(`Token ${tokenInfo.token} is not a v1 token and can't be migrated.`)
        }

        runTask({
            name: `Migrate ${tokenTypeToString(asset.tokenType)} to v2...`,
            promise: $circles.migrateV1TokensBatch($avatar.address, [asset.tokenAddress])
        });

        popupControls.close();
    }
</script>

<div class="p-6 pt-0">
    <div class="form-control mb-4">
        <p class="menu-title pl-0">
            Token
        </p>
        <BalanceRow balance={asset}/>
    </div>

    <div class="modal-action">
        <button type="submit" class="btn btn-primary" on:click={migrate}>Migrate</button>
    </div>
</div>
