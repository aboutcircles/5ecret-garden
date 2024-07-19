<script context="module" lang="ts">
    import type { TrustRelationRow } from "@circles-sdk/sdk";

    export type ExtendedTrustRelationRow = TrustRelationRow & {
        contactName?: string;
        contactImageUrl?: string;
        invitedByMe?: boolean;
        isGroup?: boolean;
        invitedMe?: boolean;
    };
</script>

<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import { goto } from "$app/navigation";
    import List from "$lib/components/List.svelte";
    import { onMount } from "svelte";
    import { avatar } from "$lib/stores/avatar";
    import { type InvitationRow } from "@circles-sdk/data";
    import ContactRow from "./components/ContactRow.svelte";
    import { circles } from "$lib/stores/circles";
    import { type Profile as ProfileType } from "@circles-sdk/profiles";

    $: rows = <ExtendedTrustRelationRow[]>[];

    async function fetchTrustRelations() {
        return await $avatar?.getTrustRelations() ?? [];
    }

    async function fetchGroupLookup(rows: ExtendedTrustRelationRow[]) {
        const getGroups = $circles?.data.findGroups(1000, {
            groupAddressIn: rows.map(row => row.objectAvatar)
        });

        if (await getGroups?.queryNextPage()) {
            const groupsResult = getGroups?.currentPage?.results ?? [];
            return groupsResult.reduce((acc, group) => {
                acc[group.group] = group;
                return acc;
            }, {} as Record<string, any>);
        }
        return {};
    }

    async function fetchInvitations() {
        const invitedBy = await $circles?.data.getInvitedBy($avatar!.address);
        const invitationsQuery = $circles?.data.getInvitations($avatar!.address, 1000);

        if (await invitationsQuery?.queryNextPage()) {
            const invitationsResult = invitationsQuery?.currentPage?.results ?? [];
            const invitations = invitationsResult.reduce((acc, invitation) => {
                acc[invitation.invited] = invitation;
                return acc;
            }, {} as Record<string, InvitationRow>);
            return { invitedBy, invitations };
        }
        return { invitedBy, invitations: {} };
    }

    async function fetchAvatarInfos(rows: ExtendedTrustRelationRow[]) {
        const contactAddresses = rows.map(row => row.objectAvatar);
        const avatars = await $circles?.data.getAvatarInfos(contactAddresses);
        return avatars?.reduce((acc, avatarInfo) => {
            acc[avatarInfo.avatar] = avatarInfo;
            return acc;
        }, {} as Record<string, any>) ?? {};
    }

    async function fetchProfiles(avatarLookup: Record<string, any>) {
        const cidAvatarLookup = Object.keys(avatarLookup).reduce((acc, key) => {
            const avatarInfo = avatarLookup[key];
            if (avatarInfo?.cidV0) {
                acc[avatarInfo.cidV0] = key;
            }
            return acc;
        }, {} as Record<string, string>);

        const profilesByCid = await $circles?.profiles?.getMany(Object.keys(cidAvatarLookup));
        return Object.keys(cidAvatarLookup).reduce((acc, cid) => {
            const avatarAddress = cidAvatarLookup[cid];
            if (profilesByCid) {
                acc[avatarAddress] = profilesByCid[cid];
            }
            return acc;
        }, {} as Record<string, ProfileType>);
    }

    function enrichRows(rows: ExtendedTrustRelationRow[], groupLookup: Record<string, any>, invitationData: any, profilesByAvatarAddressLookup: Record<string, ProfileType>) {
        const { invitedBy, invitations } = invitationData;
        rows.forEach(row => {
            row.invitedByMe = !!invitations[row.objectAvatar];
            row.invitedMe = invitedBy === row.objectAvatar;
            row.isGroup = !!groupLookup[row.objectAvatar];
            if (row.isGroup) {
                row.contactName = groupLookup[row.objectAvatar].name;
            }
            const profile = profilesByAvatarAddressLookup[row.objectAvatar];
            if (profile) {
                row.contactName = profile.name;
                row.contactImageUrl = profile.previewImageUrl;
            }
        });
        return rows;
    }

    async function refresh() {
        const _rows = await fetchTrustRelations();
        const groupLookup = await fetchGroupLookup(_rows);
        const invitationData = await fetchInvitations();
        const avatarLookup = await fetchAvatarInfos(_rows);
        const profilesByAvatarAddressLookup = await fetchProfiles(avatarLookup);
        rows = enrichRows(_rows, groupLookup, invitationData, profilesByAvatarAddressLookup);
    }

    onMount(() => {
        refresh();
        return $avatar?.events.subscribe(async event => {
            const trustEvents = ["CrcV1_Trust", "CrcV2_Trust", "CrcV2_InviteHuman"];
            if (!trustEvents.includes(event.$event)) {
                return;
            }
            await refresh();
        });
    });

    async function addContact() {
        await goto('/contacts/add');
    }
</script>

<div class="flex justify-between items-center mb-4">
    <ActionButton action={addContact}>
        Add contact
    </ActionButton>
</div>

<List rows={rows} rowComponent={ContactRow} />
