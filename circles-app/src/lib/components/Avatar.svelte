<script lang="ts" context="module">
    import type {Profile} from "@circles-sdk/profiles";
    import {get} from "svelte/store";
    import {circles} from "$lib/stores/circles";

    const profileCache = new Map<string, Profile>();

    function addProfile(address: string, profile: Profile) {
        profileCache.set(address, profile);
    }

    export async function getProfile(address: string): Promise<Profile> {
        if (profileCache.has(address)) {
            return profileCache.get(address)!;
        }
        try {
            const sdk = await get(circles);
            if (address?.toLowerCase() == sdk?.circlesConfig?.migrationAddress?.toLowerCase()){
                return {
                    name: "Migration contract"
                }
            }
            const avatar = await sdk?.getAvatar(address, false);
            let profile = await avatar?.getProfile();
            if (!profile) {
                profile = {name: address};
            }
            addProfile(address, profile);
            return profile;
        } catch (e) {
            const defaultProfile = {name: address};
            addProfile(address, defaultProfile);
            return defaultProfile;
        }
    }
</script>

<script lang="ts">
    import {onMount} from "svelte";

    export let address: string;

    let profile: Profile;

    onMount(async () => {
        if (!address) {
            throw new Error("address is required");
        }
        profile = await getProfile(address);
    })
</script>

{#if !profile}
    <p>...</p>
{:else}
    {profile?.name ?? address}
{/if}