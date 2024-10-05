<script lang="ts">
    import type {PopupContentApi} from "$lib/components/PopUp.svelte";
    import {onMount} from "svelte";
    import FlowDecoration from "$lib/flows/FlowDecoration.svelte";
    import type {MigrateToV2Context} from "$lib/flows/migrateToV2/context";
    import {runTask} from "../../../routes/+layout.svelte";
    import {circles} from "$lib/stores/circles";
    import {avatar} from "$lib/stores/avatar";
    import {removeProfileFromCache} from "$lib/components/Avatar.svelte";

    export let contentApi: PopupContentApi;
    export let context: MigrateToV2Context;

    // New variable for token amount input
    let tokenAmount = "";

    onMount(async () => {
    });

    // Migrate avatar (profile and trust relations) function
    async function migrateAvatar() {
        if (!$circles || !$avatar?.address) {
            throw new Error("Sdk or Avatar store not initialized");
        }
        if (!context.profile) {
            throw new Error("Profile not initialized");
        }

        runTask({
            name: `Migrating your Avatar ...`,
            promise: $circles.migrateAvatar($avatar.address, context.profile)
        })
            .then(async () => {
                removeProfileFromCache($avatar!.address);
                $avatar!.avatarInfo!.version = 2;
                $avatar!.avatarInfo!.v1Stopped = true;  // Block V1 minting
                $avatar = $avatar;
            });
    }

    // Migrate V1 tokens function (with optional token amount)
    async function migrateV1Tokens() {
        if (!$circles || !$avatar?.address) {
            throw new Error("Sdk or Avatar store not initialized");
        }

        // Here, you can handle whether the input is a token amount or if they want to migrate all tokens
        let tokens = tokenAmount ? [context.token] : [];

        runTask({
            name: `Migrating ${tokenAmount || 'all'} V1 tokens...`,
            promise: $circles.migrateV1Tokens($avatar.address, tokens)
        })
            .then(async () => {
                // Handle successful token migration
                $avatar!.avatarInfo!.v1Stopped = true; // Stop minting but continue using V1 tokens
                $avatar = $avatar;
            });
    }

    // Function to handle the entire migration process (avatar + tokens)
    async function migrate() {
        // Migrate avatar first
        await migrateAvatar();
        
        // Migrate V1 tokens afterward
        await migrateV1Tokens();

        contentApi.close();
    }
</script>

<FlowDecoration>
    <p>
        You're ready to migrate to Circles V2! 
        You can specify the amount of V1 tokens you want to migrate below, or leave it blank to migrate all tokens.
        Click the button to start the migration process.
    </p>

    <!-- Input field for token amount (optional) -->
    <div class="flex flex-col mt-4">
        <label for="tokenAmount" class="mb-2 text-sm font-medium">Enter token amount to migrate (optional):</label>
        <input
            id="tokenAmount"
            type="number"
            min="0"
            bind:value={tokenAmount}
            placeholder="Enter amount"
            class="input input-primary px-4 py-2 border rounded-md"
        />
    </div>

    <div class="flex justify-end space-x-2 mt-6">
        <button type="submit" class="btn btn-primary px-6 py-2 rounded-md text-white bg-blue-500 hover:bg-blue-600"
                on:click={() => migrate()}>
            Migrate to V2
        </button>
    </div>
</FlowDecoration>
