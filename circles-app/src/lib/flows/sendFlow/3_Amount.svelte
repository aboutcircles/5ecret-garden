<script lang="ts">
    import type {PopupContentApi} from "$lib/components/PopUp.svelte";
    import type {SendFlowContext} from "$lib/flows/sendFlow/context";
    import SelectAmount from "$lib/pages/SelectAmount.svelte";
    import Send from "./4_Send.svelte";
    import FlowDecoration from "$lib/flows/FlowDecoration.svelte";

    export let contentApi: PopupContentApi;
    export let context: SendFlowContext;

    function handleSelect(event: CustomEvent<{ amount: number }>) {
        context.amount = event.detail.amount;
        console.log("Selected amount:", context.amount);

        contentApi.open({
            title: "Send",
            component: Send,
            props: {
                context: context
            }
        });
    }
</script>
<FlowDecoration>
    <SelectAmount
            asset={context.selectedAsset}
            receiverAddress={context.selectedAddress}
            amount={context.amount}
            on:select={handleSelect}/>
</FlowDecoration>