<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import {wallet} from "$lib/stores/wallet";
    import {circles} from "$lib/stores/circles";
    import {goto} from "$app/navigation";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {canMigrate} from "$lib/guards/canMigrate";
    import ProfileEditor from "./editors/Profile.svelte";
    import {type Profile} from "@circles-sdk/profiles";
    import {cidV0ToUint8Array} from "@circles-sdk/utils";
    import {onMount} from "svelte";

    async function changeWallet() {
        $avatar = undefined;
        $circles = undefined;
        $wallet = undefined;

        await goto("/connect-wallet");
    }

    async function loadProfileData(cid: string): Promise<Profile> {
        if (!$circles?.profiles) {
            throw new Error('Profiles not available');
        }

        return await $circles?.profiles?.get(cid);
    }

    async function saveProfileData(profile: Profile): Promise<string> {
        if (!$circles?.profiles) {
            throw new Error('Profiles not available');
        }

        return await $circles.profiles.create(profile);
    }

    let profile: Profile;

    $: {
        console.log(profile);
    }

    onMount(async () => {
        const cid = $avatar?.avatarInfo?.cidV0;
        profile = cid
            ? await loadProfileData(cid)
            : {
                name: "",
                description: "",
                previewImageUrl: "",
                imageUrl: undefined
            };
    });

    async function migrateToV2() {
        await goto("/migrate-to-v2");
    }

    async function saveProfile() {
        const cid = await saveProfileData(profile);
        const digest = cidV0ToUint8Array(cid);
        const receipt = await $circles?.nameRegistry?.updateMetadataDigest(digest);
        if (!receipt) {
            throw new Error('Failed to update metadata digest');
        }

        console.log(`Profile updated with CID: ${cid}`);
    }
</script>

<div class="space-y-6">

    <div class="space-y-6">
        <div class="bg-white p-4 rounded shadow">
            <h2 class="text-lg font-medium">Personal Profile</h2>
            <ProfileEditor bind:profile={profile}/>
        </div>
    </div>

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
