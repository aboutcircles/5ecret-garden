<script lang="ts">
    import {goto} from "$app/navigation";
    import {wallet} from "$lib/stores/wallet";
    import {circles} from "$lib/stores/circles";
    import {avatar} from "$lib/stores/avatar";
    import {Sdk} from "@circles-sdk/sdk";
    import {chiadoConfig} from "$lib/chiadoConfig";
    import {
        SdkContractRunnerWrapper
    } from "@circles-sdk/adapter-ethers";
    import {JsonRpcProvider} from "ethers6";
    import {ComethSdkContractRunner} from "@circles-sdk/adapter-cometh";
    import {SupportedNetworks} from "@cometh/connect-sdk";
    import {onMount} from "svelte";

    const apiKey = "dBtmwl3iT790iItpLSjeo3D06Rd4jCt7";

    async function connectCometh() {
        try {
            const localStorageAddress = window.localStorage.getItem("walletAddress");
            console.log("localStorageAddress:", localStorageAddress);

            const jsonRpcProvider = new JsonRpcProvider(chiadoConfig.circlesRpcUrl);
            const comethSdkContractRunner = new ComethSdkContractRunner(apiKey, SupportedNetworks.CHIADO, localStorageAddress ?? undefined);
            await comethSdkContractRunner.init();
            if (!comethSdkContractRunner.address) {
                throw new Error("No wallet address found");
            }
            const walletAddress = comethSdkContractRunner.address;
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
                await goto("/_new/dashboard");
            } else {
                await goto("/_new/register");
            }
        } catch (e) {
            console.error("Error connecting to Cometh:", e);
        }
    }

    onMount(() => {
        connectCometh();
    });
</script>

<div class="hero bg-base-200 min-h-screen">
    <div class="hero-content flex-col lg:flex-row-reverse">

        <div class="card bg-base-100 w-96 shadow-xl">
            <figure class="px-10 pt-10">
                <span class="loading loading-spinner loading-lg"></span>
            </figure>
            <div class="card-body items-center text-center">
                <h2 class="card-title">Connecting your Cometh wallet ...</h2>
                <p>Please wait while we're loading your wallet</p>
                <a href="/_new/connect-wallet" class="btn btn-warning">Cancel</a>
            </div>
        </div>
    </div>
</div>