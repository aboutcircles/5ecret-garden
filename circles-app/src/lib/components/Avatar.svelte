<script lang="ts" context="module">
    import type {Profile} from "@circles-sdk/profiles";
    import {get} from "svelte/store";
    import {circles} from "$lib/stores/circles";

    const profileCache = new Map<string, Promise<Profile>>();

    function addProfile(address: string, profile: Promise<Profile>) {
        profileCache.set(address, profile);
    }

    export async function getProfile(address: string): Promise<Profile> {
        if (profileCache.has(address)) {
            return profileCache.get(address)!;
        }
        const profilePromise = new Promise<Profile>(async (resolve) => {
            try {
                const sdk = get(circles);
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
                resolve(profile);
            } catch (e) {
                const defaultProfile = {name: address};
                resolve(defaultProfile);
            }
        });
        addProfile(address, profilePromise);
        return profilePromise;
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