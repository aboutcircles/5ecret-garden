<script lang="ts">
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import {avatar} from "$lib/stores/avatar";
    import {floorToDecimals} from "$lib/utils/shared";

    export let row: TokenBalanceRow;

    function balanceToString(balance: TokenBalanceRow) {
        if (!balance) {
            return "";
        }

        let assetName = "";

        if (balance.tokenOwner === $avatar?.address) {
            assetName += " Own";
        }
        if (balance.isWrapped) {
            assetName += " Wrapped";
            if (balance.isInflationary) {
                assetName += " Static";
            } else {
                assetName += " Demurraged"
            }
        }
        if (balance.isGroup) {
            assetName += " Group";
        }

        return assetName + " Circles"
    }
</script>
<style>
    .icon-container {
        position: relative;
        display: inline-block;
    }

    .envelope-icon-large {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 32px;
        height: 32px;
        border-radius: 9999px;
    }

    .main-icon {
        position: relative;
        left: 0;
        top: 0;
        width: 3rem;
        height: 3rem;
        border-radius: 9999px;
    }
</style>


<div class="icon-container">
    {#if !row.isGroup && !row.isWrapped}
        <img src="/logo.svg" alt="Personal token minting" class="main-icon">
    {:else if row.isGroup}
        <img src="/group.svg" alt="Group token minting" class="main-icon">
    {:else if row.isWrapped}
        <img src="/wrapped.svg" alt="Group token minting" class="main-icon">
    {/if}
</div>

<div class="ml-4">
    <p class="text-sm">{balanceToString(row)}</p>
    <p class="text-xs text-gray-500">{row.tokenAddress}</p>
</div>
<div class="ml-auto">
    <p class:text-green-700={true}
       class="text-lg">{floorToDecimals(row.circles)}</p>
</div>