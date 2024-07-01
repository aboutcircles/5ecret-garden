<script lang="ts">
    import List from "$lib/components/List.svelte";
    import {onMount} from "svelte";
    import {avatar} from "$lib/stores/avatar";
    import type {GroupRow} from "@circles-sdk/data";
    import GroupRowView from "./components/GroupRow.svelte";
    import {circles} from "$lib/stores/circles";

    $: rows = <GroupRow[]>[];

    async function refresh() {
        if(!$circles?.data) {
            return;
        }
        const getMemberships = $circles.data.getGroupMemberships($avatar?.address ?? "", 25);
        const getGroups = $circles.data.findGroups(25);
        const [membershipsHasRows, groupsHasRows] = await Promise.all([getMemberships.queryNextPage(), getGroups.queryNextPage()]);

        if (groupsHasRows && getGroups.currentPage) {
            rows = getGroups.currentPage.results;
        }
        if (membershipsHasRows && getMemberships.currentPage) {
            const memberships = getMemberships.currentPage.results;
            rows = rows.map(row => {
                row.isMember = memberships.some(membership => membership.group === row.group);
                return row;
            });
        }
    }

    onMount(() => {
        refresh();
        return $avatar?.events.subscribe(async event => {
            if (event.$event !== "CrcV2_RegisterGroup") {
                return;
            }
            await refresh();
        });
    });
</script>

<!-- Invited by: -->

<List rows={rows} rowComponent={GroupRowView}/>
