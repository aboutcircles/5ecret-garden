<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {goto} from "$app/navigation";
    import {gnosisConfig} from "$lib/circlesConfig";
    import {Sdk} from "../../../../../circlesubi/circles-sdk/packages/sdk";

    async function connectWallet() {
        goto("/connect-wallet");
    }


    async function multiTrust() {
        const config = gnosisConfig;

        const sdk = new Sdk(config, );
    }

</script>
<!--
<div class="flex flex-col items-center justify-center h-full p-6 space-y-4">
    <h1 class="text-3xl font-bold mb-4">Welcome to the App</h1>
    <p class="text-gray-700 mb-6 text-center">Your gateway to seamless transactions.</p>
    <ActionButton action={connectWallet}>
        Get started
    </ActionButton>
</div>
-->