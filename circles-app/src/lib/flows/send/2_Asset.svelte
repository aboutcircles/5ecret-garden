<script lang="ts">
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import type {SendFlowContext} from "$lib/flows/send/context";
    import SelectAsset from "$lib/pages/SelectAsset.svelte";
    import SelectAmount from "./3_Amount.svelte";
    import {onMount} from "svelte";
    import FlowDecoration from "$lib/flows/FlowDecoration.svelte";
    import {circlesBalances} from "$lib/stores/circlesBalances";
  import { popupControls } from "$lib/stores/popUp";
    export let context: SendFlowContext;

    let selectedAsset: TokenBalanceRow | undefined = undefined;

    onMount(() => {
        if (context?.selectedAsset) {
            selectedAsset = context.selectedAsset;
        }
    });

    function handleSelect(event: CustomEvent<TokenBalanceRow>) {
        selectedAsset = event.detail;
        context.selectedAsset = selectedAsset;

        popupControls.open({
            title: "Enter Amount",
            component: SelectAmount,
            props: {
                context: context
            }
        });
    }
</script>
<FlowDecoration>
    <p class="text-2xl font-bold">Select Asset</p>
    <SelectAsset selectedAsset={selectedAsset}
                 balances={circlesBalances}
                 on:select={handleSelect}/>
</FlowDecoration>