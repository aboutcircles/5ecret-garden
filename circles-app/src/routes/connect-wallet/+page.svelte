<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {goto} from "$app/navigation";
    import {wallet} from "$lib/stores/wallet";
    import {circles} from "$lib/stores/circles";
    import {avatar} from "$lib/stores/avatar";
    import {type CirclesConfig, Sdk} from "@circles-sdk/sdk";
    import {chiadoConfig, gnosisConfig} from "$lib/chiadoConfig";
    import {
        BrowserProviderContractRunner,
        SdkContractRunnerWrapper
    } from "@circles-sdk/adapter-ethers";
    import {JsonRpcProvider} from "ethers6";
    import {ComethSdkContractRunner} from "@circles-sdk/adapter-cometh";
    import {SupportedNetworks} from "@cometh/connect-sdk";


    const apiKey = "dBtmwl3iT790iItpLSjeo3D06Rd4jCt7";

    //
    // Connects the wallet and initializes the Circles SDK.
    //
    async function connectWallet() {
        $wallet = new BrowserProviderContractRunner();
        await $wallet.init();

        const network = await $wallet.provider?.getNetwork();
        if (!network) {
            throw new Error('Failed to get network');
        }
        const circlesConfig = await getCirclesConfig(network.chainId);

        // Initialize the Circles SDK and set it as $circles to make it globally available.
        $circles = new Sdk(circlesConfig, $wallet!);

        const avatarInfo = await $circles.data.getAvatarInfo($wallet.address!);

        // If the signer address is already a registered Circles wallet, go straight to the dashboard.
        if (avatarInfo) {
            $avatar = await $circles.getAvatar($wallet.address!);
            await goto("/dashboard");
        } else {
            await goto("/register");
        }
    }

    async function getCirclesConfig(chainId: bigint): Promise<CirclesConfig> {
        switch (chainId) {
            case 100n:
                return gnosisConfig;
            case 10200n:
                return chiadoConfig;
            default:
                throw new Error(`Unsupported chain-id: ${chainId}`);
        }
    }

    async function connectCometh() {
        const localStorageAddress = window.localStorage.getItem("walletAddress");
        console.log("localStorageAddress:", localStorageAddress);

        const jsonRpcProvider = new JsonRpcProvider(chiadoConfig.circlesRpcUrl);
        const comethSdkContractRunner = new ComethSdkContractRunner(apiKey, SupportedNetworks.CHIADO, localStorageAddress ?? undefined);
        const walletAddress = await comethSdkContractRunner.address;
        const ethersContractRunner = new SdkContractRunnerWrapper(jsonRpcProvider, walletAddress, comethSdkContractRunner);
        await ethersContractRunner.init();

        window.localStorage.setItem("walletAddress", walletAddress);
        console.log("Connected wallet address:", walletAddress);

        $wallet = ethersContractRunner;

        // Initialize the Circles SDK and set it as $circles to make it globally available.
        $circles = new Sdk(chiadoConfig, $wallet!);

        const avatarInfo = await $circles.data.getAvatarInfo(walletAddress);

        // If the signer address is already a registered Circles wallet, go straight to the dashboard.
        if (avatarInfo) {
            $avatar = await $circles.getAvatar(walletAddress);
            await goto("/dashboard");
        } else {
            await goto("/register");
        }
    }
</script>
<div class="flex flex-col items-center justify-center h-full p-6 space-y-4">
    <h1 class="text-2xl font-bold mb-4">Connect Your Wallet</h1>
    <p class="text-gray-700 mb-6 text-center">Please connect your wallet to continue.</p>

    <ActionButton action={connectWallet}>
        Connect Metamask
    </ActionButton>

    <ActionButton action={connectCometh}>
        Connect via Cometh
    </ActionButton>
</div>