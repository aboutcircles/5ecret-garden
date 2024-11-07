<script lang="ts">
    import { goto } from '$app/navigation';
    import { wallet } from '$lib/stores/wallet';
    import { circles } from '$lib/stores/circles';
    import { avatar } from '$lib/stores/avatar';
    import { type CirclesConfig, Sdk } from '@circles-sdk/sdk';
    import { chiadoConfig, gnosisConfig } from '$lib/chiadoConfig';
    import { BrowserProviderContractRunner } from '@circles-sdk/adapter-ethers';
    import { onMount } from 'svelte';



    const GNOSIS_CHAIN_ID_HEX = "0x64"; // Hexadecimal format for MetaMask request
    const GNOSIS_CHAIN_ID_DEC = 100n;   // Decimal format for BrowserProvider

    //
    // Connects the wallet and initializes the Circles SDK.
    //
    async function connectWallet() {
        localStorage.removeItem("usePK");
        localStorage.setItem("useMM", "true");

        const wallet = new BrowserProviderContractRunner();
        await wallet.init();

        // Set wallet provider
        $wallet = wallet;

        const network = await $wallet.provider?.getNetwork();
        if (!network) {
            throw new Error('Failed to get network');
        }

        // If we're on the wrong network, attempt to switch
        if (![GNOSIS_CHAIN_ID_DEC].includes(network.chainId)) {
            await switchOrAddGnosisNetwork();
        }

        const circlesConfig = await getCirclesConfig(network.chainId);

        // Initialize the Circles SDK and set it as $circles to make it globally available.
        $circles = new Sdk($wallet!, circlesConfig);

        const avatarInfo = await $circles.data.getAvatarInfo($wallet.address!);
        console.log(avatarInfo);

        // If the signer address is already a registered Circles wallet, go straight to the dashboard.
        if (avatarInfo) {
            $avatar = await $circles.getAvatar($wallet.address!);
            await goto('/_new/dashboard');
        } else {
            await goto('/_new/register');
        }
    }

    //
    // Gets the Circles configuration based on the chain ID.
    //
    async function getCirclesConfig(chainId: bigint): Promise<CirclesConfig> {
    console.log("Resolved chain ID:", chainId); // Debugging output

    // Check for supported chain IDs
        if (chainId === 100n) {
            return gnosisConfig;
        } else if (chainId === 10200n) {
            return chiadoConfig;
        } else {
            // Call switchOrAddGnosisNetwork for unsupported chain IDs and then throw an error
            await switchOrAddGnosisNetwork();
            throw new Error(`Unsupported chain-id: ${chainId}`);
        }
    }



    //
    // Switches to the Gnosis network if not already connected.
    //
    async function switchOrAddGnosisNetwork() {
        if (typeof window.ethereum !== "undefined") {
            try {
                // Attempt to switch to the Gnosis network
                await window.ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: GNOSIS_CHAIN_ID_HEX }],
                });
            } catch (switchError: any) {
                // If the network is not added yet, error code 4902 indicates adding it is necessary
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: "wallet_addEthereumChain",
                            params: [{
                                chainId: GNOSIS_CHAIN_ID_HEX,
                                chainName: "Gnosis",
                                rpcUrls: ["https://rpc.gnosischain.com"],
                                nativeCurrency: {
                                    name: "XDAI",
                                    symbol: "XDAI",
                                    decimals: 18
                                },
                                blockExplorerUrls: ["https://blockscout.com/poa/xdai/"]
                            }],
                        });
                    } catch (addError) {
                        console.error("Failed to add the Gnosis network:", addError);
                    }
                } else {
                    console.error("Failed to switch to the Gnosis network:", switchError);
                }
            }
        } else {
            console.error("window.ethereum is not available. Ensure MetaMask is installed.");
        }
    }

    onMount(() => {
        connectWallet();
    });
</script>

<div class="hero bg-base-200 min-h-screen">
    <div class="hero-content flex-col lg:flex-row-reverse">
        <div class="card bg-base-100 w-96 shadow-xl">
            <figure class="px-10 pt-10">
                <span class="loading loading-spinner loading-lg"></span>
            </figure>
            <div class="card-body items-center text-center">
                <h2 class="card-title">Connecting your MetaMask wallet ...</h2>
                <p>Please wait while we're loading your wallet</p>
                <a href="/_new/connect-wallet" class="btn btn-warning">Cancel</a>
            </div>
        </div>
    </div>
</div>
