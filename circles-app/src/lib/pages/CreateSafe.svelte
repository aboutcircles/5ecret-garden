<script lang="ts">
    import { wallet } from "$lib/stores/wallet";
    import Safe from "@safe-global/protocol-kit";
    import type {
        PredictedSafeProps,
        SafeAccountConfig,
        SafeDeploymentConfig,
    } from "@safe-global/protocol-kit";
    import { gnosis } from "viem/chains";
    import { createEventDispatcher } from "svelte";
    import { onMount } from "svelte";
    import { BrowserProviderContractRunner } from "@circles-sdk/adapter-ethers";
    import { ethers } from "ethers";

    const dispatch = createEventDispatcher();
    let isCreating = false;
    let error: string | null = null;
    let isWalletReady = false;

    onMount(() => {
        isWalletReady = !!$wallet;
    });

    async function createSafe() {
        isCreating = true;
        error = null;

        if (!$wallet || !($wallet instanceof BrowserProviderContractRunner)) {
            error = "Wallet not connected or invalid type";
            isCreating = false;
            return;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        if (!$wallet.provider) {
            error = "Wallet provider is not available";
            isCreating = false;
            return;
        }

        try {
            const ownerAddress = await signer.getAddress();
            if (!ownerAddress) throw new Error("No wallet address available");

            const safeAccountConfig: SafeAccountConfig = {
                owners: [ownerAddress],
                threshold: 1,
            };
            console.log(safeAccountConfig);

            const randomSalt = ethers.hexlify(ethers.randomBytes(32));
            const safeDeploymentConfig: SafeDeploymentConfig = {
                saltNonce: randomSalt,
            };

            const predictedSafe: PredictedSafeProps = {
                safeAccountConfig,
                safeDeploymentConfig,
            };
            console.log(predictedSafe);

            const protocolKit = await Safe.init({
                provider: window.ethereum, // Use browserProvider
                predictedSafe,
                signer: ownerAddress,
            });

            const safeAddress = await protocolKit.getAddress();
            console.log("Safe address:", safeAddress);

            const deploymentTransaction =
                await protocolKit.createSafeDeploymentTransaction();

            const client = await protocolKit
                .getSafeProvider()
                .getExternalSigner();
            console.log(client, "this is client value");

            if (!client) {
                throw new Error("Failed to get external signer");
            }

            const transactionHash = await client.sendTransaction({
                to: deploymentTransaction.to,
                value: BigInt(deploymentTransaction.value),
                data: deploymentTransaction.data as `0x${string}`,
                chain: gnosis, // Use chain instead of chainId
            });

            console.log("Transaction hash:", transactionHash);

            await $wallet.provider.waitForTransaction(transactionHash.hash);

            const isSafeDeployed = await protocolKit.connect({
                safeAddress,
            });

            if (isSafeDeployed) {
                dispatch("safecreated", { address: safeAddress });
                console.log("Safe created event dispatched:", safeAddress);
            } else {
                throw new Error("Safe deployment failed");
            }
        } catch (err) {
            error =
                err instanceof Error
                    ? err.message
                    : "An unknown error occurred";
            console.error("Error creating safe:", err);
        } finally {
            isCreating = false;
        }
    }
</script>

{#if error}
    <div class="error">{error}</div>
{/if}

<button
    class="btn btm-nav-xs btn-outline btn-primary"
    class:loading={isCreating}
    disabled={isCreating || !isWalletReady || error}
    on:click={createSafe}
>
    {#if isCreating}
        Creating Safe...
    {:else}
        Create New Safe
    {/if}
</button>

<style>
    .error {
        color: red;
        margin: 1em 0;
    }
</style>
