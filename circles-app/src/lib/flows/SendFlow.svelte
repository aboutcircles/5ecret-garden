<script lang="ts" context="module">
    import type {Profile} from "@circles-sdk/profiles";
    import {contactList} from "$lib/stores/contactList";

    export type SendFlowSteps = "SelectContact" | "SelectAsset" | "Send";
</script>
<script lang="ts">
    import SelectContact from "$lib/flows/sendFlow/SelectContact.svelte";
    import SelectAsset from "$lib/flows/sendFlow/SelectAsset.svelte";
    import Send from "$lib/flows/sendFlow/Send.svelte";

    let currentStep: SendFlowSteps = "SelectContact";

    let selectedAddress: string;
    let selectedProfile: Profile;

    let tokenAddress: string;

    let recipient: string;
    let recipientProfile: Profile;
    let assetAddress: string;

    let stack: SendFlowSteps[] = [];
</script>
<div>
    {#if stack?.length > 0}
        <button class="btn btn-outline" on:click={() => {
            currentStep = stack.pop();
            stack = stack;
        }}>
            Back
        </button>
    {/if}
    {#if currentStep === "SelectContact"}
        <SelectContact recentAddresses={$contactList}
                       on:select={(e) => {
            stack.push(currentStep);
            stack = stack;
            selectedAddress = e.detail.address;
            selectedProfile = e.detail.profile;
            currentStep = "SelectAsset"
        }}/>
    {:else if currentStep === "SelectAsset"}
        <SelectAsset on:select={(e) => {
            stack.push(currentStep);
            stack = stack;
            tokenAddress = e.detail.tokenAddress;
            recipient = selectedAddress;
            recipientProfile = selectedProfile;
            assetAddress = tokenAddress;
            currentStep = "Send";
    }}/>
    {:else if currentStep === "Send"}
        <Send receiverAddress={recipient} receiverProfile={recipientProfile} tokenAddress={assetAddress}/>
    {/if}
</div>