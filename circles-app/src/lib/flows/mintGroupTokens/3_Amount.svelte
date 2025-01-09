<script lang="ts">
    import SelectAmount from "$lib/pages/SelectAmount.svelte";
    import Mint from "./4_Mint.svelte";
    import FlowDecoration from "$lib/flows/FlowDecoration.svelte";
    import type {GroupMintFlowContext} from "$lib/flows/mintGroupTokens/context";
  import { popupControls } from "$lib/stores/popUp";

    export let context: GroupMintFlowContext;

    function handleSelect(event: CustomEvent<{ amount: number }>) {
        context.amount = event.detail.amount;
        console.log("Selected amount:", context.amount);

        popupControls.open({
            title: "Mint",
            component: Mint,
            props: {
                context: context
            }
        });
    }
</script>
<FlowDecoration>
    <p class="text-2xl font-bold mt-14">Enter Amount</p>
    <SelectAmount
            asset={context.selectedAsset}
            amount={context.amount}
            on:select={handleSelect}/>
</FlowDecoration>