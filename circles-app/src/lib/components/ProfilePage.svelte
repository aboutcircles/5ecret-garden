<script lang="ts">
    import {circles} from "$lib/stores/circles";
    import type {Profile} from "@circles-sdk/profiles";
    import Avatar, {getProfile} from "$lib/components/Avatar.svelte";
    import {avatar} from "$lib/stores/avatar";
    import CommonConnections from "$lib/components/CommonConnections.svelte";
    import {shortenAddress} from "$lib/utils/shared";
    import type {Readable} from "svelte/store";
    import type {ContactList} from "$lib/stores/contacts";
    import {onMount} from "svelte";
    import type {AvatarRow} from "@circles-sdk/data";
    import {ensureContacts} from "../../routes/+layout.svelte";
    import type {ExtendedTrustRelationRow} from "../../routes/contacts/+page.svelte";

    let contacts: Readable<{ data: ContactList, next: () => Promise<boolean>, ended: boolean }> | undefined = undefined;

    export let address: string | undefined;

    onMount(() => {
        contacts = ensureContacts();
    })

    $: {
        if (address) {
            initialize(address);
        }
    }

    let otherAvatar: AvatarRow | undefined;
    let profile: Profile | undefined;

    async function initialize(address?: string) {
        if (!address) {
            return;
        }
        if (!$circles) {
            return;
        }
        if (!$avatar) {
            return;
        }

        otherAvatar = await $circles.data.getAvatarInfo(address);
        if (otherAvatar?.version === 2) {
            profile = await getProfile(otherAvatar.avatar);
        }

        if (!profile) {
            profile = {
                name: otherAvatar?.name ?? address,
            };
        }
    }

    function getTypeString(type: string | undefined) {
        if (!type) {
            return "";
        }
        if (type === "CrcV2_RegisterHuman") {
            return "Human";
        } else if (type === "CrcV2_RegisterGroup") {
            return "Group";
        } else if (type === "CrcV2_RegisterOrganization") {
            return "Organozation";
        } else if (type === "CrcV1_Signup") {
            return "Human (v1)";
        }
    }

    function getRelationText(row: ExtendedTrustRelationRow, profile?: Profile) {
        if (!row) {
            return `You and ${profile?.name} don't trust each other`;
        }
        if (row.relation === "mutuallyTrusts") {
            return `You and ${profile?.name} trust each other`;
        } else if (row.relation === "trustedBy") {
            return `${profile?.name} trusts you`;
        } else if (row.relation === "trusts") {
            return `You trust ${profile?.name}`;
        }

        throw new Error(`Unknown relation: ${row.relation}`);
    }

    function newLineToBr(text: string) {
        return text.replace(/\n/g, "<br>");
    }

    function getTrustRow(address: string | undefined) {
        if (!address) {
            return undefined;
        }
        if (!$contacts) {
            return undefined;
        }
        return $contacts.data[address]?.row;
    }
</script>
<div>
    <div class="bg-base-200 p-6">
        <div class="card-title text-2xl">
            <Avatar view="vertical" imageStyle="square" clickable={false} address={otherAvatar?.avatar}>
                <div class="mt-2">
                    <span>{getTypeString(otherAvatar?.type)}</span> -
                    <a class="underline font-normal" target="_blank"
                       href={"https://gnosisscan.io/address/" + otherAvatar?.avatar}>
                        {shortenAddress(otherAvatar?.avatar)}
                    </a>
                </div>
            </Avatar>
        </div>

        <!-- Updated Button Layout: Flex Row for Horizontal Alignment -->
        <div class="w-full flex flex-row justify-center space-x-4 p-4">
            {#if getTrustRow(otherAvatar?.avatar)?.relation === "trustedBy"
            && otherAvatar.type === "CrcV2_RegisterGroup"}
                <button class="btn btn-sm btn-round btn-outline">
                    <img src="/banknotes.svg" alt="Incoming trust" class="w-6 h-6 inline"/>
                    Mint
                </button>
            {/if}
            <button class="btn btn-sm btn-round btn-outline">
                <img src="/send.svg" alt="Send" class="w-6 h-6 inline"/> Send
            </button>
            {#if getTrustRow(otherAvatar?.avatar)?.relation === "trusts"}
                <button class="btn btn-sm btn-round bg-red-400 text-white">
                    <img src="/trash.svg" alt="Untrust" class="w-6 h-6 inline"/>
                    Untrust
                </button>
            {:else if getTrustRow(otherAvatar?.avatar)?.relation === "mutuallyTrusts"}
                <button class="btn btn-sm btn-round bg-red-400 text-white">
                    <img src="/trash.svg" alt="Untrust" class="w-6 h-6 inline"/>
                    Untrust
                </button>
            {:else if getTrustRow(otherAvatar?.avatar)?.relation === "trustedBy"}
                <button class="btn btn-sm btn-round bg-red-400 text-white">
                    <img src="/shield-check.svg" alt="Trust back" class="w-6 h-6 inline"/>
                    Trust back
                </button>
            {:else}
                <button class="btn btn-sm btn-round bg-red-400 text-white">
                    <img src="/shield-check.svg" alt="Trust" class="w-6 h-6 inline"/>
                    Trust
                </button>
            {/if}
        </div>
    </div>
    <div class="p-6">
        <p class="menu-title pl-0">
            Trust:
        </p>
        <p>
        <span class="inline">
            {#if getTrustRow(otherAvatar?.avatar)?.relation === "trusts"}
                <img src="/outgoing.svg" alt="Outgoing trust" class="w-3 h-3 inline"/>
            {:else if getTrustRow(otherAvatar?.avatar)?.relation === "trustedBy"}
                <img src="/incoming.svg" alt="Incoming trust" class="w-3 h-3 inline"/>
            {:else if getTrustRow(otherAvatar?.avatar)?.relation === "mutuallyTrusts"}
                <img src="/mutual.svg" alt="Mutual trust" class="w-3 h-3 inline"/>
            {:else}
                <img src="/no-trust.svg" alt="No trust" class="w-3 h-3 inline"/>
            {/if}
            <span class:text-green-700={getTrustRow(otherAvatar?.avatar)?.relation === "mutuallyTrusts"}>{getRelationText(getTrustRow(otherAvatar?.avatar), profile)}</span>
        </span>
        </p>

        {#if profile?.description}
            <p class="menu-title pl-0">
                Description:
            </p>
            <p class="font-normal text-lg">
                {@html newLineToBr(profile?.description)}
            </p>
        {/if}

        <CommonConnections otherAvatarAddress={otherAvatar?.avatar}/>
    </div>
</div>
