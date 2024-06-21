<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {goto} from "$app/navigation";
    import {wallet} from "$lib/stores/wallet";
    import {circles} from "$lib/stores/circles";
    import {BrowserProvider} from "ethers";
    import {avatar} from "$lib/stores/avatar";
    import {Sdk} from "@circles-sdk/sdk";
    import {chainConfig} from "$lib/chainConfig";

    //
    // Gets the browser provider from the window object.
    //
    function getBrowserProvider() {
        const w: any = window;
        if (!w.ethereum) {
            throw new Error('No browser wallet found (window.ethereum is undefined)');
        }
        return new BrowserProvider(w.ethereum);
    }

    async function initializeSdk() {
        // The circles sdk must be initialized with the
        // contract addresses and endpoints for the chain.
        // It takes a signer as the second argument.
        return new Sdk(chainConfig, $wallet!);
    }

    async function isCirclesWallet(address: string) {
        // Use the data object from the circles sdk to check if the address
        // is a registered Circles wallet.
        const avatarRow = await $circles?.data.getAvatarInfo(address);
        return !!avatarRow;
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
            $avatar = await $circles.getAvatar(walletAddress);
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