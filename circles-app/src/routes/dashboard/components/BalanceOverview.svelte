<script lang="ts">
    import {onMount} from "svelte";
    import {avatar} from "$lib/stores/avatar";
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import List from "$lib/components/List.svelte";
    import BalanceRow from "./BalanceRow.svelte";

    let balances: TokenBalanceRow[] = [];

    onMount(async () => {
        const gotBalances = await $avatar?.getBalances();
        if (!gotBalances) {
            return;
        }

        balances = gotBalances;
    });
</script>

<List rowComponent={BalanceRow} rows={balances}>
</List>