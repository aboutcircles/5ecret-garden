<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {wallet} from "$lib/stores/wallet";
    import {circles} from "$lib/stores/circles";
    import {goto} from "$app/navigation";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {canMigrate} from "$lib/guards/canMigrate";

    async function changeWallet() {
        $avatar = undefined;
        $circles = undefined;
        $wallet = undefined;

        await goto("/connect-wallet");
    }

    async function migrateToV2() {
        await goto("/migrate-to-v2");
    }

    $: avatarInfo = {
        address: $avatar?.address,
        tokenId: $avatar?.avatarInfo?.tokenId
    }
</script>

<div class="space-y-6">
    <div class="bg-white p-4 rounded shadow">
        <h2 class="text-lg font-medium">Profile</h2>
        <div class="mt-3 space-y-2">
            <div>
                <label for="circlesAddress" class="block text-sm font-medium text-gray-700">Circles address</label>
                <input type="text" id="circlesAddress"
                       readonly
                       value={avatarInfo.address}
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                       placeholder="0x.....">
            </div>
            {#if $avatar?.avatarInfo?.v1Token && !$avatar?.avatarInfo?.v1Stopped}
                <div>
                    <label for="tokenAddress" class="block text-sm font-medium text-gray-700">Token address</label>
                    <input type="text" id="tokenAddress" class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                           readonly
                           value={$avatar.avatarInfo.v1Token}
                           placeholder="0x.....">
                </div>
            {/if}
        </div>
    </div>

    {#if canMigrate($avatar?.avatarInfo)}
        <div class="bg-white p-4 rounded shadow">
            <h2 class="text-lg font-medium">Circles V2</h2>
            <div class="mt-3 space-y-2">
                <div>
                    <ActionButton action={migrateToV2}>
                        Update to Circles V2
                    </ActionButton>
                </div>
            </div>
        </div>
    {/if}

    <div class="bg-white p-4 rounded shadow">
        <h2 class="text-lg font-medium">Wallet</h2>
        <div class="mt-3 space-y-2">
            <div>
                <ActionButton action={changeWallet}>
                    Connect different wallet
                </ActionButton>
            </div>
        </div>
    </div>
</div>
