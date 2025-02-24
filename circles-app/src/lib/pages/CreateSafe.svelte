<script lang="ts">
    import { wallet } from "$lib/stores/wallet";
    import { SafeSdkBrowserContractRunner } from "@circles-sdk/adapter-safe";
    import Safe, {
        PredictedSafeProps,
        SafeAccountConfig,
        SafeDeploymentConfig,
    } from "@safe-global/protocol-kit";
    import { gnosis } from "viem/chains";
    import { createEventDispatcher } from "svelte";
    import { onMount } from "svelte";

    const dispatch = createEventDispatcher();
    let isCreating = false;
    let error: string | null = null;

    onMount(async () => {
        if (!$wallet) {
            throw new Error("Wallet address is not available");
        }
    });

    async function createSafe() {
        isCreating = true;
        error = null;

        if ($wallet instanceof SafeSdkBrowserContractRunner) {
            try {
                const signer = await $wallet.browserProvider.getSigner();
                console.log(signer);
                const provider = $wallet.browserProvider.provider;
                console.log(provider);

                const ownerAddress = await signer.getAddress();
                if (!ownerAddress)
                    throw new Error("No wallet address available");

                const safeAccountConfig: SafeAccountConfig = {
                    owners: [ownerAddress],
                    threshold: 1,
                };

                const predictedSafe: PredictedSafeProps = {
                    safeAccountConfig,
                    // More optional properties
                };

                const protocolKit = await Safe.init({
                    provider: $wallet.browserProvider,
                    predictedSafe,
                    signer,
                });

                const safeAddress = await protocolKit.getAddress();
                console.log(safeAddress);

                const deploymentTransaction =
                    await protocolKit.createSafeDeploymentTransaction();

                const client = protocolKit
                    .getSafeProvider()
                    .getExternalSigner();

                const transactionHash = await client.sendTransaction({
                    to: deploymentTransaction.to,
                    value: BigInt(deploymentTransaction.value),
                    data: deploymentTransaction.data as `0x${string}`,
                    chain: gnosis,
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
    }
</script>

{#if error}
    <div class="error">{error}</div>
{/if}

<button on:click={createSafe} disabled={isCreating}>
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
