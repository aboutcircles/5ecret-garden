<script lang="ts">
    // TODO: Add the actual balance of the connected wallet.
    let balance = 0;

    // TODO: Add the actual address of the connected wallet.
    let address = "";
</script>

<header class="bg-blue-500 text-white p-4 flex items-center">
    <img src="/logo.svg" alt="User Icon" class="w-12 h-12 rounded-full">
    <div class="ml-4">
        <h1 class="text-xl font-semibold">{address}</h1>
        <p class="text-sm">{balance} Circles</p>
    </div>
</header>