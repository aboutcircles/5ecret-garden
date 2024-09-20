<script lang="ts" context="module">
    import type {Profile} from "@circles-sdk/profiles";
    import {get} from "svelte/store";
    import {circles} from "$lib/stores/circles";
    import type {AvatarRow} from "@circles-sdk/data";
    import {shortenAddress} from "$lib/utils/shared";
    import {ethers} from "ethers";

    const profileCache = new Map<string, Promise<Profile>>();

    function addProfile(address: string, profile: Promise<Profile>) {
        profileCache.set(address, profile);
    }

    export function removeProfileFromCache(address: string) {
        profileCache.delete(address);
    }

    function setFallbackValues(address: string, avatar: AvatarRow | undefined, profile: Profile | undefined): Profile {
        const fallbackProfile: Profile = {
            name: shortenAddress(address),
            previewImageUrl: "/logo.svg"
        };

        if (avatar?.type === "CrcV2_RegisterHuman" || avatar?.type === "CrcV1_Signup") {
            fallbackProfile.previewImageUrl = '/person.svg';
        }
        if (avatar?.type === "CrcV2_RegisterGroup") {
            fallbackProfile.previewImageUrl = '/group.svg';
        }
        if (avatar?.type === "CrcV2_RegisterOrganization") {
            fallbackProfile.previewImageUrl = '/organization.svg';
        }

        if (avatar?.name) {
            fallbackProfile.name = avatar.name;
        }

        if (!profile) {
            return fallbackProfile;
        }

        if ((profile?.name?.trim() ?? "") === "") {
            profile.name = fallbackProfile.name;
        }

        if (!profile.previewImageUrl || profile.previewImageUrl.trim() === "") {
            profile.previewImageUrl = fallbackProfile.previewImageUrl
        }

        return profile;
    }

    export type CirclesSafeMap = { [safeAddress: string]: Profile };
    export const CirclesGardenApi = `https://api.circles.garden/`;

    async function queryCirclesGarden(safeAddresses: string[]): Promise<CirclesSafeMap> {
        const safeAddressCopy = JSON.parse(JSON.stringify(safeAddresses));
        const batches: string[][] = [];

        while (safeAddressCopy.length) {
            batches.push(safeAddressCopy.splice(0, 50));
        }

        const circlesSafeMap: CirclesSafeMap = {};

        if (batches.length == 0) {
            return circlesSafeMap;
        }

        for (let batch of batches) {
            const query = batch.reduce((p, c) => p + `address[]=${ethers.getAddress(c)}&`, "");
            const requestUrl = `${CirclesGardenApi}api/users/?${query}`;

            const requestResult = await fetch(requestUrl);
            const requestResultJson = await requestResult.json();

            const profiles: (Profile & {safeAddress: string})[] =
                requestResultJson.data.map((o: any) => {
                    return <Profile & {safeAddress: string}>{
                        name: o.username,
                        previewImageUrl: o.avatarUrl,
                        safeAddress: o.safeAddress.toLowerCase()
                    };
                }) ?? [];

            profiles.forEach((o) => {
                if (!o.safeAddress) return;
                circlesSafeMap[o.safeAddress] = o;
            }, circlesSafeMap);
        }

        return circlesSafeMap;
    }

    export async function getProfile(address: string): Promise<Profile> {
        if (address === "0x0000000000000000000000000000000000000001") {
            return {
                name: "Transitive transfer",
                previewImageUrl: "/logo.svg"
            };
        }

        const $circles = get(circles);
        if (address === $circles?.circlesConfig.v2HubAddress?.toLowerCase()) {
            return {
                name: "Circles V2 Hub Contract",
                previewImageUrl: "/logo.svg"
            };
        }
        if (address === $circles?.circlesConfig.migrationAddress?.toLowerCase()) {
            return {
                name: "Circles V2 Migration Contract",
                previewImageUrl: "/logo.svg"
            };
        }

        if (profileCache.has(address)) {
            return profileCache.get(address)!;
        }

        const profilePromise = new Promise<Profile>(async (resolve) => {
            const sdk = get(circles);
            if (!sdk) {
                throw new Error("sdk is required");
            }

            let avatar = await sdk?.data.getAvatarInfo(address);
            let profile: Profile | undefined = undefined;

            if (avatar?.version === 2 && avatar.cidV0) {
                profile = await sdk.profiles?.get(avatar.cidV0);
            }
            if (avatar?.version === 1) {
                // TODO: Get the profile from the circles.garden api
                const circlesGardenResults = await queryCirclesGarden([address]);
                profile = circlesGardenResults[address] ?? {};
            }
            profile = setFallbackValues(address, avatar, profile);
            resolve(profile);
        });

        addProfile(address, profilePromise);

        return profilePromise;
    }
</script>

<script lang="ts">
    import HorizontalAvatarLayout from "$lib/components/avatar/HorizontalAvatarLayout.svelte";
    import VerticalAvatarLayout from "$lib/components/avatar/VerticalAvatarLayout.svelte";
    import {createEventDispatcher} from "svelte";
    import VerticalSmallAvatarLayout from "$lib/components/avatar/VerticalSmallAvatarLayout.svelte";

    export let address: string;
    export let clickable: boolean = true;
    export let view: "horizontal" | "vertical" | "vertical_small" = "horizontal";
    export let imageStyle: "square" | "circle" = "circle";
    export let showName: boolean = true;

    const eventDispatcher = createEventDispatcher();

    let profile: Profile | undefined;

    $: {
        if (address) {
            initialize();
        }
    }

    async function initialize() {
        profile = await getProfile(address);
    }
</script>

{#if !profile}
    <div class="inline-flex items-center space-x-2">
        <img src={"/sparkles.svg"}
             alt="Loading user Icon" class="w-8 h-8 rounded-full">
        <span>...</span>
    </div>
{:else}
    {#if view === "vertical"}
        <VerticalAvatarLayout showName={showName} imageStyle={imageStyle} address={address} clickable={clickable}
                              profile={profile}>
            <slot></slot>
        </VerticalAvatarLayout>
    {:else if view === "vertical_small"}
        <VerticalSmallAvatarLayout showName={showName} imageStyle={imageStyle} address={address} clickable={clickable}
                                   profile={profile}>
            <slot></slot>
        </VerticalSmallAvatarLayout>
    {:else}
        <HorizontalAvatarLayout showName={showName} imageStyle={imageStyle} address={address} clickable={clickable}
                                profile={profile}>
            <slot></slot>
        </HorizontalAvatarLayout>
    {/if}
{/if}