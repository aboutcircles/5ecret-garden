import { getVaultAddress, getVaultBalances } from "$lib/utils/vault";
import { CirclesRpc } from "@circles-sdk/data";
import { uint256ToAddress, type Address } from "@circles-sdk/utils";

type GroupMetrics = {
    memberCountPerHour: Array<{ timestamp: Date; count: number }>;
    memberCountPerDay: Array<{ timestamp: Date; count: number }>;
    collateralInTreasury: Array<{ avatar: Address; amount: bigint }>;
}

export let groupMetrics: GroupMetrics = $state({
    memberCountPerHour: [],
    memberCountPerDay: [],
    collateralInTreasury: [],
});

export async function initGroupMetricsStore(
    circlesRpc: CirclesRpc,
    groupAddress: Address
): Promise<void> {
    groupMetrics.memberCountPerHour = await getMemberCountPerHour(circlesRpc, groupAddress);
    groupMetrics.memberCountPerDay = await getMemberCountPerDay(circlesRpc, groupAddress);
    groupMetrics.collateralInTreasury = await getCollateralInTreasury(circlesRpc, groupAddress);
}

async function getMemberCountPerHour(
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
        },
    ]);

    return result.result.rows.map(([_, ts, v]) => ({
        timestamp: new Date(ts),
        count: Number(v),
    }));
}

async function getMemberCountPerDay(
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
        },
    ]);

    return result.result.rows.map(([_, ts, v]) => ({
        timestamp: new Date(ts),
        count: Number(v),
    }));
}

async function getCollateralInTreasury(
    circlesRpc: CirclesRpc,
    groupAddress: Address
): Promise<Array<{ avatar: Address; amount: bigint }>> {
    const vaultAddress = await getVaultAddress(circlesRpc, groupAddress);
    if (!vaultAddress) {
        return [];
    }

    const balancesResult = await getVaultBalances(
        circlesRpc,
        vaultAddress
    );
    if (!balancesResult) {
        ;
        return [];
    }

    const { columns, rows } = balancesResult;
    const colId = columns.indexOf('id');
    const colBal = columns.indexOf('balance');

    return rows.map((row) => ({
        avatar: uint256ToAddress(BigInt(row[colId])),
        amount: BigInt(row[colBal]),
    }));
}