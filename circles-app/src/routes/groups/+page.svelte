<script lang="ts" context="module">
    import type { GroupRow } from "@circles-sdk/data";

    export type ExtendedGroupRow = GroupRow & {
        isMember?: boolean;
        contactImageUrl?: string;
    };
</script>
<script lang="ts">
    import List from "$lib/components/List.svelte";
    import { onMount } from "svelte";
    import { avatar } from "$lib/stores/avatar";
    import GroupRowView from "./components/GroupRow.svelte";
    import { circles } from "$lib/stores/circles";
    import { type Profile as ProfileType } from "@circles-sdk/profiles";

    $: rows = <ExtendedGroupRow[]>[];

    async function fetchGroupMemberships() {
        if (!$circles?.data) return [];
        const getMemberships = $circles.data.getGroupMemberships($avatar?.address ?? "", 1000);
        if (await getMemberships.queryNextPage()) {
            return getMemberships?.currentPage?.results ?? [];
        }
        return [];
    }

    async function fetchGroups() {
        if (!$circles?.data) return [];
        const getGroups = $circles.data.findGroups(1000);
        if (await getGroups.queryNextPage()) {
            return getGroups?.currentPage?.results ?? [];
        }
        return [];
    }

    async function fetchProfiles(rows: ExtendedGroupRow[]) {
        const addresses = rows.map(row => row.group);
        console.log("fetchProfiles", addresses);
        const profiles: Record<string, ProfileType> = await $circles?.profiles?.getMany(addresses) ?? {};
        return profiles;
    }

    function enrichRowsWithMemberships(rows: ExtendedGroupRow[], memberships: any[]) {
        return rows.map(row => {
            row.isMember = memberships.some(membership => membership.group === row.group);
            return row;
        });
    }

    function enrichRowsWithProfiles(rows: ExtendedGroupRow[], profileLookup: Record<string, any>) {
        console.log("enrichRowsWithProfiles", rows, profileLookup);
        return rows.map(row => {
            const profile = profileLookup[row.group];
            if (profile) {
                row.contactImageUrl = profile.previewImageUrl;
            }
            return row;
        });
    }

    async function refresh() {
        const [groups, memberships] = await Promise.all([fetchGroups(), fetchGroupMemberships()]);
        const profileLookup = await fetchProfiles(groups);

        rows = enrichRowsWithMemberships(groups, memberships);
        rows = enrichRowsWithProfiles(rows, profileLookup);
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
