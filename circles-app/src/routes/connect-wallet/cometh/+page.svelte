<script context="module" lang="ts">
    import {ComethWallet} from "@cometh/connect-sdk";
    import {type ContractRunner, type Provider, type TransactionRequest, type TransactionResponse} from "ethers";

    export class ComethContractRunner implements ContractRunner {
        private _comethWallet: ComethWallet;

        constructor(comethWallet: ComethWallet) {
            this._comethWallet = comethWallet;
        }

        get provider() : null | Provider {
            return this;
        }

        async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
            if (!this._comethWallet.signer) {
                throw new Error("No signer available in ComethWallet.");
            }

            // Ensure the signer is connected to a provider
            if (!this._comethWallet.signer.provider) {
                const provider = this._comethWallet.getProvider();
                if (provider) {
                    this._comethWallet.signer = this._comethWallet.signer.connect(provider);
                } else {
                    throw new Error("No provider available in ComethWallet.");
                }
            }

            return await this._comethWallet.signer.sendTransaction(tx);
        }

        async call(tx: TransactionRequest): Promise<string> {
            if (!this._comethWallet.signer || !this._comethWallet.getProvider()) {
                throw new Error("No provider available in ComethWallet.");
            }

            // Adapt the contract call using the provider attached to the signer
            return await this._comethWallet.getProvider().call(tx);
        }

        async estimateGas(tx: TransactionRequest): Promise<bigint> {
            if (!this._comethWallet.signer) {
                throw new Error("No signer available in ComethWallet.");
            }

            // Estimate gas using the signer
            return await this._comethWallet.signer.estimateGas(tx);
        }
    }
</script>

<script lang="ts">
    import {ComethProvider, ConnectAdaptor, SupportedNetworks} from "@cometh/connect-sdk";
    import {onMount} from "svelte";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {type CirclesConfig, Sdk, type SdkContractRunner} from "@circles-sdk/sdk";
    import {wallet} from "$lib/stores/wallet";
    import {goto} from "$app/navigation";
    import {circles} from "$lib/stores/circles";
    import {avatar} from "$lib/stores/avatar";
    import {AbstractProvider} from "ethers";
    import {circlesConfig, gnosisConfig} from "$lib/circlesConfig";

    const apiKey = "";
    const walletAdaptor = new ConnectAdaptor({
        chainId: SupportedNetworks.CHIADO,
        apiKey,
    });

    const instance = new ComethWallet({
        authAdapter: walletAdaptor,
        apiKey,
    });

    async function getCirclesConfig(provider: AbstractProvider): Promise<CirclesConfig> {
        // Check if the chain-id is either 100 (0x64 - Gnosis) or 10200 (0x27D8 - Chiado).
        // These are the only two supported chains.
        const chainId: any = await provider.getNetwork().then(network => network.chainId);

        switch (chainId) {
            case 100n:
            case 100:
                return gnosisConfig;
            case 10200n:
            case 10200:
                return circlesConfig;
            default:
                throw new Error(`Unsupported chain-id: ${chainId}`);
        }
    }

    async function connectCometh() {
        const localStorageAddress = window.localStorage.getItem("walletAddress");
        await instance.connect(localStorageAddress ?? undefined);
        const walletAddress = instance.getAddress();
        console.log("Connected wallet address:", walletAddress);

        const comethContractRunner: ContractRunner = new ComethContractRunner(instance);

        const sdkContractRunner: SdkContractRunner = {
            address: walletAddress,
            runner: comethContractRunner
        }

        // Set the signer as $connectedWallet to make it globally available.
        $wallet = sdkContractRunner;

        const provider = instance.getProvider();
        const circlesConfig = await getCirclesConfig(provider);
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
</script>

<div class="flex flex-col items-center justify-center h-full p-6 space-y-4">
    <h1 class="text-2xl font-bold mb-4">Connect Your Wallet</h1>
    <p class="text-gray-700 mb-6 text-center">Please connect your wallet to continue.</p>

    <ActionButton action={connectCometh}>
        Connect via Cometh
    </ActionButton>
</div>