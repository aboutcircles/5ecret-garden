<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {onDestroy, onMount} from "svelte";
    import {profile} from "$lib/stores/profile";

    $: address = $avatar?.address;
    $: balance = $avatar?.getTotalBalance();
    $: mintableAmount = $avatar?.getMintableAmount();

    let timeout: NodeJS.Timeout | undefined;
    let unsubscribe: (() => void) | undefined;

    onMount(() => {
        timeout = setTimeout(() => {
            mintableAmount = $avatar?.getMintableAmount();
        }, 60000);

        unsubscribe = $avatar?.events.subscribe(async event => {
            if (event.$event !== "CrcV2_TransferBatch"
                && event.$event !== "CrcV2_TransferSingle"
                && event.$event !== "CrcV1_Transfer"
                && event.$event !== "CrcV1_HubTransfer") {
                return;
            }
            balance = $avatar?.getTotalBalance();
            mintableAmount = $avatar?.getMintableAmount();
        });
    });

    onDestroy(() => {
        clearTimeout(timeout);
        unsubscribe?.();
    });
</script>

<header class="bg-blue-500 text-white p-4 flex items-center">
    {#if !$profile?.previewImageUrl || $profile.previewImageUrl.trim() === ""}
        <img src="/logo.svg" alt="User Icon" class="w-12 h-12 rounded-full">
    {:else}
        <img src={$profile.previewImageUrl} alt="User Icon" class="w-12 h-12 rounded-full">
    {/if}
    <div class="ml-4">
        {#if !$profile}
            <h1 class="text-xl font-semibold">{address}</h1>
        {:else}
            <h1 class="text-xl font-semibold">{$profile.name} ({address})</h1>
        {/if}
        <p class="text-sm">
            {#await balance}
                ----.-- Circles
            {:then balance}
                {balance?.toFixed(2) ?? 0} Circles
            {:catch _}
                (Error loading balance)
            {/await}

            {#await mintableAmount}
            {:then mintableAmount}
                &nbsp;<span class="text-amber-200">({mintableAmount} Circles available to mint)</span>
            {/await}
        </p>
    </div>
</header>