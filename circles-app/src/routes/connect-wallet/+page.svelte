<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {goto} from "$app/navigation";
    import {wallet} from "$lib/stores/wallet";
    import {circles, type Sdk} from "$lib/stores/circles";
    import {BrowserProvider, JsonRpcProvider} from "ethers";
    import {avatar} from "$lib/stores/avatar";

    //
    // Gets the browser provider from the window object.
    //
    function getBrowserProvider(): JsonRpcProvider {
        const w: any = window;
        if (!w.ethereum) {
            throw new Error('No browser wallet found (window.ethereum is undefined)');
        }
        return new BrowserProvider(w.ethereum);
    }

    //
    // TODO: Initialize the SDK.
    //
    async function initializeSdk(): Sdk {
        return {};
    }

    //
    // TODO: Use the SDK to check if the connected wallet is a Circles wallet.
    //
    async function isCirclesWallet(address: string) {
        return false;
    }

    //
    // Connects the wallet and initializes the Circles SDK.
    //
    async function connectWallet() {
        const provider = getBrowserProvider();

        // Set the signer as $connectedWallet to make it globally available.
        $wallet = await provider.getSigner();

        // Initialize the Circles SDK and set it as $circles to make it globally available.
        $circles = await initializeSdk();

        const walletAddress = await $wallet.getAddress();
        const alreadyRegistered = await isCirclesWallet(walletAddress);

        // If the signer address is already a registered Circles wallet, go straight to the dashboard.
        if (alreadyRegistered) {
            // TODO: Set the exiting $avatar globally.
            $avatar = {};
            goto("/dashboard");
        } else {
            goto("/register");
        }
    }
</script>
<div class="flex flex-col items-center justify-center h-full p-6 space-y-4">
    <h1 class="text-2xl font-bold mb-4">Connect Your Wallet</h1>
    <p class="text-gray-700 mb-6 text-center">Please connect your wallet to continue.</p>

    <ActionButton action={connectWallet}>
        Connect Metamask
    </ActionButton>
</div>