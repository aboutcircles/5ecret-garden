<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {goto} from "$app/navigation";
    import List from "$lib/components/List.svelte";
    import {onMount} from "svelte";
    import {avatar} from "$lib/stores/avatar";
    import type {InvitationRow} from "@circles-sdk/data";
    import InvitationRowView from "./components/InvitationRow.svelte";
    import {circles} from "$lib/stores/circles";
    import {canInvite} from "$lib/guards/canInvite";

    $: rows = <InvitationRow[]>[];
    let invitedBy: string | undefined;

    async function refresh() {
        const result = $circles?.data?.getInvitations($avatar!.address, 25);
        if (await result?.queryNextPage()) {
            rows = result?.currentPage?.results ?? [];
        } else {
            rows = [];
        }

        invitedBy = await $circles?.data?.getInvitedBy($avatar!.address);
    }

    onMount(() => {
        refresh();
        return $avatar?.events.subscribe(async event => {
            if (event.$event !== "CrcV2_InviteHuman") {
                return;
            }
            await refresh();
        });
    });
</script>

<div class="flex justify-between items-center mb-4">
    <!-- TODO: Can I invite someone if I myself was invited but am still minting in v1? -->
    <ActionButton disabled={!canInvite($avatar?.avatarInfo)}
                  action={() => goto("/contacts/add")}>
        Invite someone
    </ActionButton>
    {#if invitedBy}
        <div class="text-gray-500 mb-2">
            <p>Invited by: {invitedBy}</p>
        </div>
    {/if}
</div>

<!-- Invited by: -->

<List rows={rows} rowComponent={InvitationRowView}/>
