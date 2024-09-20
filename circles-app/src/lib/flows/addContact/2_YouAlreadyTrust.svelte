<script lang="ts">
    import Untrust from "$lib/pages/Untrust.svelte";
    import {type PopupContentApi} from "$lib/components/PopUp.svelte";
    import type {AddContactFlowContext} from "$lib/flows/addContact/context";
    import FlowDecoration from "$lib/flows/FlowDecoration.svelte";

    export let context: AddContactFlowContext;
    export let contentApi: PopupContentApi;
</script>
<FlowDecoration>
    <p>
        You already trust this account. Do you want to untrust it?
    </p>
    <button class="btn btn-error mt-6" on:click={() => {
        contentApi.close();
        contentApi.open({
            title: "Untrust",
            component: Untrust,
            props: {
                address: context.selectedAddress,
                contentApi: contentApi
            }
        });
    }}>
        Untrust
    </button>
</FlowDecoration>