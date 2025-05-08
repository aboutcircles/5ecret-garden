import { CirclesRpc } from "@circles-sdk/data";
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

export async function getMemberCountPerHour(
    circlesRpc: CirclesRpc,
    groupAddress: Address
): Promise<Array<{ timestamp: Date; count: number }>> {
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
            Order: [{ Column: 'timestamp', Direction: 'Asc' }],
        },
    ]);

    return result.result.rows.map(([_, ts, v]) => ({
        timestamp: new Date(ts),
        count: Number(v),
    }));
}

export async function getMemberCountPerDay(
    circlesRpc: CirclesRpc,
    groupAddress: Address
): Promise<Array<{ timestamp: Date; count: number }>> {
    const result = await circlesRpc.call<{
        columns: string[];
        rows: any[][];
    }>('circles_query', [
        {
            Namespace: 'V_CrcV2',
            Table: 'GroupMembersCount_1d',
            Columns: [],
            Filter: [
                {
                    Type: 'FilterPredicate',
                    FilterType: 'Equals',
                    Column: 'group',
                    Value: groupAddress.toLowerCase(),
                },
            ],
            Order: [{ Column: 'timestamp', Direction: 'Asc' }],
        },
    ]);

    return result.result.rows.map(([_, ts, v]) => ({
        timestamp: new Date(ts),
        count: Number(v),
    }));
}