<script lang="ts">
    import {avatar} from "$lib/stores/avatar";

    $: address = $avatar?.address;
    $: balance = $avatar?.getTotalBalance();
</script>

<header class="bg-blue-500 text-white p-4 flex items-center">
    <img src="/logo.svg" alt="User Icon" class="w-12 h-12 rounded-full">
    <div class="ml-4">
        <h1 class="text-xl font-semibold">{address}</h1>
        {#await balance}
            <p class="text-sm">0 Circles</p>
        {:then balance}
            <p class="text-sm">{balance?.toFixed(2) ?? 0} Circles</p>
        {/await}
    </div>
</header>