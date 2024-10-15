<script lang="ts">
    import {goto} from '$app/navigation';
    import {wallet} from '$lib/stores/wallet';
    import {circles} from '$lib/stores/circles';
    import {Sdk} from '@circles-sdk/sdk';
    import {gnosisConfig} from '$lib/chiadoConfig';
    import {PrivateKeyContractRunner} from '@circles-sdk/adapter-ethers';
    import SeedphraseInput from "$lib/components/SeedphraseInput.svelte";
    import {ethers} from "ethers";
    import {onMount} from "svelte";

    let mnemonicPhrase: string = "";
    let hasValidKey = false;
    let privateKey = "";
    let address = "";

    const provider = new ethers.JsonRpcProvider(gnosisConfig.circlesRpcUrl);

    //
    // Connects the wallet and initializes the Circles SDK.
    //
    async function connectWallet() {
        if (!hasValidKey || address === "") {
            return;
        }

        const wallet = new PrivateKeyContractRunner(provider, privateKey);
        await wallet.init();

        localStorage.setItem('privateKey', privateKey);

        $wallet = wallet;

        // Initialize the Circles SDK and set it as $circles to make it globally available.
        $circles = new Sdk($wallet!, gnosisConfig);

        await goto('/_new/connect-wallet/select-safe');
    }

    onMount(async () => {
        localStorage.removeItem("useMM");
        localStorage.setItem("usePK", "true");

        if (localStorage.getItem('privateKey')) {
            privateKey = localStorage.getItem('privateKey')!;
            const wallet = new PrivateKeyContractRunner(provider, privateKey);
            await wallet.init();

            $wallet = wallet;

            $circles = new Sdk($wallet!, gnosisConfig);

            await goto('/_new/connect-wallet/select-safe');
        }
    });

</script>

<div class="hero bg-base-200 min-h-screen">
    <!--{#if !privateKey}-->
        <div class="hero-content flex-col lg:flex-row-reverse">
            <div class="card bg-base-100 w-full shadow-xl">
                <div class="card-body items-center text-center">
                    <h2 class="card-title">Import circles.garden keyphrase</h2>
                    <p>Please enter or paste your keyphrase from circles.garden below.</p>
                    <SeedphraseInput
                            bind:isValidMnemonic={hasValidKey}
                            bind:privateKey
                            bind:mnemonicPhrase
                            bind:address
                    />
                    <div class="card-actions">
                        <a on:click={() => connectWallet()} class="btn" class:btn-disabled={!hasValidKey}>Import</a>
                    </div>
                </div>
            </div>
        </div>
    <!--{/if}-->
</div>