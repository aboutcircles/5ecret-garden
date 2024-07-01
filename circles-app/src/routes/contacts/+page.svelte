<script context="module" lang="ts">
    import type {TrustRelationRow} from "@circles-sdk/sdk";

    export type ExtendedTrustRelationRow = TrustRelationRow & {
        contactName?: string;
        invitedByMe?: boolean;
        isGroup?: boolean;
        invitedMe?: boolean;
    };
</script>
<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {goto} from "$app/navigation";
    import List from "$lib/components/List.svelte";
    import {onMount} from "svelte";
    import {avatar} from "$lib/stores/avatar";
    import {type InvitationRow} from "@circles-sdk/data";
    import ContactRow from "./components/ContactRow.svelte";
    import {circles} from "$lib/stores/circles";

    $: rows = <ExtendedTrustRelationRow[]>[];

    async function refresh() {
        rows = await $avatar?.getTrustRelations() ?? [];

        let groupLookup: Record<string, any> = {};
        const getGroups = $circles?.data.findGroups(1000, {
            groupAddressIn: rows.map(row => row.objectAvatar)
        });

        if (await getGroups?.queryNextPage()) {
            const groupsResult = getGroups?.currentPage?.results ?? [];
            groupLookup = groupsResult.reduce((p, c) => {
                p[c.group] = c;
                return p;
            }, <Record<string, any>>{});
        }

        const invitedBy = await $circles?.data.getInvitedBy($avatar!.address);
        const invitationsQuery = $circles?.data?.getInvitations($avatar!.address, 1000);
        let invitations: Record<string, InvitationRow> = {};
        if (await invitationsQuery?.queryNextPage()) {
            const invitationsResult = invitationsQuery?.currentPage?.results ?? [];
            invitations = invitationsResult.reduce((p, c) => {
                p[c.invited] = c;
                return p;
            }, <Record<string, any>>{});
        }

        for (const row of rows) {
            row.invitedByMe = !!invitations[row.objectAvatar];
            row.invitedMe = invitedBy === row.objectAvatar;
            row.isGroup = groupLookup[row.objectAvatar];
            if (row.isGroup) {
                row.contactName = groupLookup[row.objectAvatar].name;
            }
        }
        rows = rows;
    }

    onMount(() => {
        refresh();
        return $avatar?.events.subscribe(async event => {
            if (event.$event !== "CrcV1_Trust"
                && event.$event !== "CrcV2_Trust"
                && event.$event !== "CrcV2_InviteHuman") {
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

<List rows={rows} rowComponent={ContactRow}/>
