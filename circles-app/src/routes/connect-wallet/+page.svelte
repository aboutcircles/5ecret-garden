<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {goto} from "$app/navigation";
    import {wallet} from "$lib/stores/wallet";
    import {circles} from "$lib/stores/circles";
    import {AbstractProvider, BrowserProvider} from "ethers";
    import {avatar} from "$lib/stores/avatar";
    import {type CirclesConfig, Sdk, type SdkContractRunner} from "@circles-sdk/sdk";
    import {circlesConfig, gnosisConfig} from "$lib/circlesConfig";

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

    //
    // Connects the wallet and initializes the Circles SDK.
    //
    async function connectWallet() {
        const provider = getBrowserProvider();
        const circlesConfig = await getCirclesConfig(provider);

        const signer = await provider.getSigner();

        // Set the signer as $connectedWallet to make it globally available.
        $wallet = {
            runner: signer,
            address: await signer.getAddress()
        };

        if (!$wallet) {
            throw new Error('$wallet.address is undefined');
        }

        // Initialize the Circles SDK and set it as $circles to make it globally available.
        $circles = new Sdk(circlesConfig, $wallet!);

        const avatarInfo = await $circles.data.getAvatarInfo($wallet.address);

        // If the signer address is already a registered Circles wallet, go straight to the dashboard.
        if (avatarInfo) {
            $avatar = await $circles.getAvatar($wallet.address);
            await goto("/dashboard");
        } else {
            await goto("/register");
        }
    }

    async function getCirclesConfig(provider: AbstractProvider): Promise<CirclesConfig> {
        // Check if the chain-id is either 100 (0x64 - Gnosis) or 10200 (0x27D8 - Chiado).
        // These are the only two supported chains.
        const chainId = await provider.getNetwork().then(network => network.chainId);
        if (chainId !== 100n && chainId !== 10200n) {
            throw new Error(`Unsupported chain-id: ${chainId}`);
        }

        switch (chainId) {
            case 100n:
                return gnosisConfig;
            case 10200n:
                return circlesConfig;
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