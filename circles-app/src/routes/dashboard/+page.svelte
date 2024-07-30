<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import List from "$lib/components/List.svelte";
    import TransactionRow, {type ExtendedTransactionHistoryRow} from "./components/TransactionRow.svelte";
    import { onMount } from "svelte";
    import { avatar } from "$lib/stores/avatar.js";
    import { circles } from "$lib/stores/circles";
    import { type GroupRow } from "@circles-sdk/data";

    let rows: ExtendedTransactionHistoryRow[] = [];

    async function getTransactionHistory() {
        const result = await $avatar?.getTransactionHistory(1000);
        return result?.currentPage?.results ?? [];
    }

    function extractPotentialGroups(rows: ExtendedTransactionHistoryRow[]) {
        const potentialGroups: Record<string, boolean> = {};
        rows.forEach(row => {
            if (row.tokenAddress) {
                potentialGroups[row.tokenAddress] = true;
            }
        });
        return Object.keys(potentialGroups);
    }

    async function getGroupLookup(potentialGroupAddresses: string[]) {
        const groupQuery = $circles?.data.findGroups(1000, { groupAddressIn: potentialGroupAddresses });
        const hasData = await groupQuery?.queryNextPage();
        if (!hasData) return {};

        const groupRows = groupQuery?.currentPage?.results ?? [];
        return groupRows.reduce((acc, group) => {
            acc[group.group] = group;
            return acc;
        }, {} as Record<string, GroupRow>);
    }

    async function getAvatarInfos(rows: ExtendedTransactionHistoryRow[]) {
        const addresses = new Set<string>();
        rows.forEach(row => {
            addresses.add(row.from);
            addresses.add(row.to);
            if (row.tokenAddress) {
                addresses.add(row.tokenAddress);
            }
        });
        return $circles?.data.getAvatarInfos(Array.from(addresses)) ?? [];
    }

    function createAvatarLookup(avatarInfos: any[]) {
        return avatarInfos.reduce((acc, avatarInfo) => {
            acc[avatarInfo.avatar] = avatarInfo;
            return acc;
        }, {} as Record<string, any>);
    }

    async function getProfileLookup(avatarLookup: Record<string, any>) {
        const profileLookup: Record<string, any> = {};
        for (const avatarAddress of Object.keys(avatarLookup)) {
            const avatarInfo = avatarLookup[avatarAddress];
            if (avatarInfo?.cidV0) {
                const profile = await $circles?.profiles?.get(avatarInfo.cidV0);
                if (profile) {
                    profileLookup[avatarAddress] = profile;
                }
            }
        }
        return profileLookup;
    }

    function enrichRows(rows: ExtendedTransactionHistoryRow[], groupLookup: Record<string, GroupRow>, profileLookup: Record<string, any>) {
        return rows.map(row => {
            if (row.tokenAddress) {
                const group = groupLookup[row.tokenAddress];
                if (group) {
                    row.fromProfile = profileLookup[row.tokenAddress];
                    row.groupName = group.name;
                    row.groupSymbol = group.symbol;
                }
            }
            if (profileLookup[row.from]) {
                row.fromProfile = profileLookup[row.from];
            }
            if (profileLookup[row.to]) {
                row.toProfile = profileLookup[row.to];
            }
            return row;
        });
    }

    async function refresh() {
        const resultRows = await getTransactionHistory();
        const potentialGroupAddresses = extractPotentialGroups(resultRows);

        if (potentialGroupAddresses.length === 0) {
            rows = resultRows;
            return;
        }

        const groupLookup = await getGroupLookup(potentialGroupAddresses);
        const avatarInfos = await getAvatarInfos(resultRows);
        const avatarLookup = createAvatarLookup(avatarInfos);
        const profileLookup = await getProfileLookup(avatarLookup);

        rows = enrichRows(resultRows, groupLookup, profileLookup);
    }

    onMount(() => {
        refresh();

        return $avatar?.events.subscribe(async event => {
            const transferEvents = ["CrcV1_Transfer", "CrcV2_TransferSingle", "CrcV2_TransferBatch"];
            if (!transferEvents.includes(event.$event)) {
                return;
            }
            await refresh();
        });
    });

    async function mintCircles() {
        await $avatar?.personalMint();
    }
</script>

<div class="flex justify-between items-center mb-4">
    {#if $avatar?.avatarInfo?.type === "human"}
        <ActionButton action={mintCircles}>
            Mint Circles
        </ActionButton>
    {/if}
</div>

<List rows={rows} rowComponent={TransactionRow} />
