import { CirclesQuery, CirclesRpc, type EventRow, type PagedQueryParams } from "@circles-sdk/data";
import { get } from "svelte/store";
import { circles } from "./circles";
import { avatarState } from "./avatar.svelte";
import type { Address } from "@circles-sdk/utils";

type GroupMetrics = {
    memberCount: {
        hour: any | undefined;
        day: any | undefined;
    }
    tokenHoldersBalance: any | undefined;
    collateralBalanceByToken: any | undefined;
}

export let groupMetrics: GroupMetrics = $state({
    memberCount: { hour: undefined, day: undefined },
    tokenHoldersBalance: undefined,
    collateralBalanceByToken: undefined,
});

export async function getMemberCountHour(
    circlesRpc: CirclesRpc,
    groupAddress: Address
): Promise<string | null> {
    const result = await circlesRpc.call<{
        columns: string[];
        rows: any[][];
    }>('circles_query', [
        {
            Namespace: 'V_CrcV2',
            Table: 'GroupMembersCount_1h',
            Columns: [],
            Filter: [
                {
                    Type: 'FilterPredicate',
                    FilterType: 'Equals',
                    Column: 'group',
                    Value: groupAddress.toLowerCase(),
                },
            ],
            Order: [],
        },
    ]);

    console.log(result)
    if (!result?.result.rows || result.result.rows.length === 0) {
        return null;
    }
    return result.result.rows[0][0];
}