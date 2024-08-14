<script lang="ts">
    import {avatar} from "$lib/stores/avatar";

    type Balance = {
        tokenOwner: string;
        balance: string;
    };

    export let balances: Balance[] = [];
    export let selectedCollateral: string | undefined = undefined;

    function shortenAddress(address: string): string {
        return `${address.slice(0, 6)}...${address.slice(-6)}`;
    }

    function isOwnToken(address: string): boolean {
        return address === $avatar?.address || address === $avatar?.avatarInfo?.tokenId || address === $avatar?.avatarInfo?.v1Token;
    }
</script>

<div>
    <select id="collateral" bind:value={selectedCollateral} class="form-select">
        <option value={undefined} title="Transitive">All available tokens (transitive)</option>
        {#each balances ?? [] as balance}
            <option value={balance.tokenOwner} title="{balance.tokenOwner}: {balance.balance}">
                {shortenAddress(balance.tokenOwner)}
                : {parseFloat(balance.balance).toFixed(2)} {isOwnToken(balance.tokenOwner) ? "(Own)" : ""}
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
