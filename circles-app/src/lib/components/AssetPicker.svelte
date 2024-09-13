<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {type TokenBalanceRow} from "@circles-sdk/data";
    import {floorToDecimals} from "$lib/utils/shared";

    export let balances: TokenBalanceRow[] = [];
    export let selectedCollateral: string | undefined = undefined;

    function shortenAddress(address: string): string {
        return `${address.slice(0, 6)}...${address.slice(-6)}`;
    }

    function balanceToString(balance: TokenBalanceRow) {
        let assetName = "";

        assetName += floorToDecimals(balance.circles) + " ";
        if (balance.tokenOwner === $avatar?.address) {
            assetName += " Own";
        }
        if (balance.isInflationary) {
            assetName += " Static";
        }
        if (balance.isWrapped) {
            assetName += " Wrapped";
        }
        if (balance.isGroup) {
            assetName += " Group";
        }

        return assetName + " Circles (" + shortenAddress(balance.tokenAddress) + ")"
    }
</script>

<div>
    <select id="collateral" bind:value={selectedCollateral} class="form-select">
        <option value={undefined} title="Transitive">All available tokens (transitive)</option>
        {#each balances ?? [] as balance}
            <option value={balance.tokenAddress} title="{balance.tokenOwner}: {balance.circles}">
                {balanceToString(balance)}
            </option>
        {/each}
    </select>
</div>

<style>
    select.form-select {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 0.25rem;
    }

    select.form-select option {
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        display: block;
    }
</style>
