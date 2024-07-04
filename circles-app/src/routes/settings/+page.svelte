<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {wallet} from "$lib/stores/wallet";
    import {circles} from "$lib/stores/circles";
    import {goto} from "$app/navigation";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {canMigrate} from "$lib/guards/canMigrate";
    import Profile from "./editors/Profile.svelte";

    async function changeWallet() {
        $avatar = undefined;
        $circles = undefined;
        $wallet = undefined;

        await goto("/connect-wallet");
    }

    async function migrateToV2() {
        await goto("/migrate-to-v2");
    }
</script>

<div class="space-y-6">
    <Profile></Profile>

    {#if canMigrate($avatar?.avatarInfo ?? undefined)}
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
