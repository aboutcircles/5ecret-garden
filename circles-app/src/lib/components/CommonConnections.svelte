<script lang="ts">
    import type {TrustRelationRow} from "@circles-sdk/data";
    import type {AvatarInterface} from "@circles-sdk/sdk";
    import {avatar} from "$lib/stores/avatar";
    import {circles} from "$lib/stores/circles";
    import type {Profile} from "@circles-sdk/profiles/src";
    import Avatar, {getProfile} from "$lib/components/Avatar.svelte";

    export let otherAvatarAddress: string;

    let commonContacts: string[] = [];
    let profile: Profile | undefined;
    let otherAvatar: AvatarInterface | undefined;
    let otherAvatarOutgoingTrust: Record<string, TrustRelationRow> = {};
    let avatarContactsByAddress: Record<string, TrustRelationRow> = {};

    $:{
        if (otherAvatarAddress) {
            initialize();
        }
    }

    async function initialize() {
        if (!otherAvatarAddress) {
            return;
        }
        if (!$circles) {
            return;
        }
        if (!$avatar) {
            return;
        }

        otherAvatar = await $circles.getAvatar(otherAvatarAddress);
        if (otherAvatar?.avatarInfo?.version === 2) {
            profile = await getProfile(otherAvatar.address);
        }

        if (!profile) {
            profile = {
                name: otherAvatar.avatarInfo?.name ?? otherAvatarAddress,
            };
        }

        otherAvatarOutgoingTrust = (await otherAvatar.getTrustRelations())
            .filter(o => o.relation == "mutuallyTrusts" || o.relation == "trusts")
            .reduce((acc, contact) => {
                acc[contact.objectAvatar] = contact;
                return acc;
            }, {} as Record<string, TrustRelationRow>);

        avatarContactsByAddress = (await $avatar.getTrustRelations())
            .filter(o => o.relation == "mutuallyTrusts" || o.relation == "trusts")
            .reduce((acc, contact) => {
                acc[contact.objectAvatar] = contact;
                return acc;
            }, {} as Record<string, TrustRelationRow>);

        commonContacts = Object.keys(otherAvatarOutgoingTrust).filter(address => avatarContactsByAddress[address]);
    }
</script>
<p class="menu-title pl-0">
    Common connections:
</p>
<ul>
    {#each commonContacts as contact(contact)}
        <li class="p-2">
            <Avatar clickable={false} address={contact}>
                {contact}
            </Avatar>
        </li>
    {/each}
    {#if commonContacts.length === 0}
        <li class="p-2">
            No common connections
        </li>
    {/if}
</ul>