<script lang="ts" context="module">
    import type {Profile} from "../../../../../../temp/circles-sdk/packages/profiles/src";

    export type SendFlowSteps = "SelectContact" | "SelectAsset" | "Send";
</script>
<script lang="ts">
    import SelectContact from "$lib/pages/SelectContact.svelte";
    import SelectAsset from "$lib/pages/SelectAsset.svelte";
    import Send from "$lib/pages/SelectAmount.svelte";
    import type {Readable} from "svelte/store";
    import {type ContactList} from "$lib/stores/contacts";
    import {onMount} from "svelte";
    import {ethers} from "ethers6";
    import {avatar} from "$lib/stores/avatar";
    import {transitiveTransfer} from "$lib/pages/SelectAsset.svelte";
    import type {PopupContentApi} from "$lib/components/PopUp.svelte";
    import {ensureContacts} from "../../routes/+layout.svelte";

    export let contentApi: PopupContentApi;

    let currentStep: SendFlowSteps = "SelectContact";

    let selectedAddress: string;
    let selectedProfile: Profile;

    let tokenAddress: string;
    let tokenOwner: string;
    let tokenType: string;
    let circlesBalance: number;

    let recipient: string;
    let recipientProfile: Profile;
    let assetAddress: string;

    let contacts: Readable<{ data: ContactList, next: () => Promise<boolean>, ended: boolean }> | undefined = undefined;
    onMount(() => {
        contacts = ensureContacts();
    });

    async function send(e:CustomEvent<{amount: number}>) {
        if (!$avatar) {
            return;
        }
        if (!ethers.isAddress(recipient)) {
            throw new Error(`Invalid receiver address: ${recipient}`);
        }
        if (!ethers.isAddress(tokenAddress)) {
            throw new Error(`Invalid token address: ${tokenAddress}`);
        }

        if (tokenAddress === transitiveTransfer().tokenAddress) {
            console.log("Transitive transfer");
            await $avatar.transfer(recipient!, e.detail.amount);
        } else {
            console.log("Normal transfer");
            await $avatar.transfer(recipient!, e.detail.amount, tokenAddress);
        }


    }
</script>
<div class="p-6 pt-0">
    {#if currentStep === "SelectContact"}
        <SelectContact recentAddresses={$contacts?.data}
                       on:select={(e) => {
            selectedAddress = e.detail.address;
            selectedProfile = e.detail.profile;
            currentStep = "SelectAsset"
        }}/>
    {:else if currentStep === "SelectAsset"}
        <SelectAsset
                on:back={() => {
                }}
                on:select={(e) => {
                    tokenOwner = e.detail.tokenOwner;
                    tokenAddress = e.detail.tokenAddress;
                    tokenType = e.detail.tokenType;
                    circlesBalance = e.detail.circles;
                    recipient = selectedAddress;
                    recipientProfile = selectedProfile;
                    assetAddress = tokenAddress;
                    currentStep = "Send";
                }}/>
    {:else if currentStep === "Send"}
        <Send on:send={send}
              receiverAddress={recipient}
              receiverProfile={recipientProfile}
              circlesBalance={circlesBalance}
              tokenType={tokenType}
              tokenOwner={tokenOwner}
              tokenAddress={assetAddress}/>
    {/if}
</div>