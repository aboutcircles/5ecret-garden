<script context="module" lang="ts">
    import type {TrustRelationRow} from "@circles-sdk/sdk";

    export type TrustRelationRowWithInvitationFlag = TrustRelationRow & {
        invitedByMe?: boolean;
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

    $: rows = <TrustRelationRowWithInvitationFlag[]>[];

    async function refresh() {
        rows = await $avatar?.getTrustRelations() ?? [];

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
