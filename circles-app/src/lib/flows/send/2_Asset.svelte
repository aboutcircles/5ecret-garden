<script lang="ts">
    import type {PopupContentApi} from "$lib/components/PopUp.svelte";
    import type {TokenBalanceRow} from "@circles-sdk/data";
    import type {SendFlowContext} from "$lib/flows/send/context";
    import SelectAsset from "$lib/pages/SelectAsset.svelte";
    import SelectAmount from "./3_Amount.svelte";
    import {onMount} from "svelte";
    import FlowDecoration from "$lib/flows/FlowDecoration.svelte";
    import {circlesBalances} from "$lib/stores/circlesBalances";

    export let contentApi: PopupContentApi;
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

        contentApi.open({
            title: "Enter Amount",
            component: SelectAmount,
            props: {
                context: context
            }
        });
    }
</script>
<FlowDecoration>
    <SelectAsset selectedAsset={selectedAsset}
                 balances={circlesBalances}
                 on:select={handleSelect}/>
</FlowDecoration>