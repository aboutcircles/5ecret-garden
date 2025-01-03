<script lang="ts">
    import type {TrustRelationRow} from "@circles-sdk/data";
    import type {AvatarInterface} from "@circles-sdk/sdk";
    import {avatar} from "$lib/stores/avatar";
    import {circles} from "$lib/stores/circles";
    import type {Profile} from "@circles-sdk/profiles";
  import { getProfile } from "$lib/utils/profile";
  import Avatar from "./avatar/Avatar.svelte";

    export let otherAvatarAddress: string;
    export let contentApi: any;
    export let commonConnectionsCount: number = 0;

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
        commonConnectionsCount = commonContacts.length;
    }
</script>
<!-- <p class="menu-title pl-0">
    Common connections:
</p> -->
<ul class="w-full divide-y p-4">
    {#each commonContacts as contact(contact)}
        <li class="w-full flex items-center justify-between px-0 py-4">
            <Avatar contentApi={contentApi} address={contact} view="horizontal">
                <!-- {contact} -->
            </Avatar>
        </li>
    {/each}
    {#if commonContacts.length === 0}
        <li>
            No common connections
        </li>
    {/if}
</ul>