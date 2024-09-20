<script lang="ts">
    import type {PopupContentApi} from "$lib/components/PopUp.svelte";
    import Send from "$lib/pages/Send.svelte";
    import type {SendFlowContext} from "$lib/flows/send/context";
    import FlowDecoration from "$lib/flows/FlowDecoration.svelte";
    import {runTask} from "../../../routes/+layout.svelte";
    import {floorToDecimals} from "$lib/utils/shared";
    import {avatar} from "$lib/stores/avatar";
    import {ethers} from "ethers6";

    export let contentApi: PopupContentApi;
    export let context: SendFlowContext;

    function handleSend() {
        if (!$avatar) {
            throw new Error("Avatar not found");
        }
        if (!context.selectedAddress) {
            throw new Error("No address selected");
        }
        if (!context.selectedAsset) {
            throw new Error("No asset selected");
        }
        if (!context.amount) {
            throw new Error("No amount specified");
        }

        const collateral = [context.selectedAsset!.tokenOwner];
        const amounts = [ethers.parseEther(context.amount!.toString())];
        const data = Uint8Array.of(0);

        runTask({
            name: `Minting ${floorToDecimals(context.amount)} Group Circles ...`,
            promise: $avatar.groupMint(context.selectedAddress!, collateral, amounts, data)
        });
        contentApi.close();
    }
</script>
<FlowDecoration>
    <Send asset={context.selectedAsset}
          amount={context.amount}
          receiverAddress={context.selectedAddress}
          on:select={handleSend}
    />
</FlowDecoration>