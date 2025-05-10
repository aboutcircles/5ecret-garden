import { getVaultAddress, getVaultBalances } from "$lib/utils/vault";
import { CirclesRpc } from "@circles-sdk/data";
import { uint256ToAddress, type Address } from "@circles-sdk/utils";

type memberCount = {
    timestamp: Date;
    count: number;
}

type mintRedeem = {
    timestamp: Date;
    minted: number;
    redeemed: number;
    supply: number;
}

type GroupMetrics = {
    memberCountPerHour: Array<memberCount> | undefined;
    memberCountPerDay: Array<memberCount> | undefined;
    collateralInTreasury: Array<{ avatar: Address; amount: bigint }> | undefined;
    mintRedeemPerHour: Array<mintRedeem> | undefined;
    mintRedeemPerDay: Array<mintRedeem> | undefined;
}

export let groupMetrics: GroupMetrics = $state({
    memberCountPerHour: undefined,
    memberCountPerDay: undefined,
    collateralInTreasury: undefined,
    mintRedeemPerHour: undefined,
    mintRedeemPerDay: undefined,
});

export async function initGroupMetricsStore(
    circlesRpc: CirclesRpc,
    groupAddress: Address
): Promise<void> {
    groupMetrics.memberCountPerHour = await getMemberCountPerHour(circlesRpc, groupAddress);
    groupMetrics.memberCountPerDay = await getMemberCountPerDay(circlesRpc, groupAddress);
    groupMetrics.collateralInTreasury = await getCollateralInTreasury(circlesRpc, groupAddress);
    groupMetrics.mintRedeemPerHour = await getMintRedeemPerHour(circlesRpc, groupAddress);
    groupMetrics.mintRedeemPerDay = await getMintRedeemPerDay(circlesRpc, groupAddress);
    console.log(groupMetrics.memberCountPerHour);
    // await getGroupTokenHoldersBalance(circlesRpc, groupAddress);
}

async function getMemberCountPerHour(
    circlesRpc: CirclesRpc,
    groupAddress: Address
): Promise<Array<memberCount>> {
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
            Limit: 24
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
): Promise<Array<memberCount>> {
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
            Limit: 30,
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

async function getMintRedeemPerDay(
    circlesRpc: CirclesRpc,
    groupAddress: Address
): Promise<Array<mintRedeem>> {
    const result = await circlesRpc.call<{
        columns: string[];
        rows: any[][];
    }>('circles_query', [
        {
            Namespace: 'V_CrcV2',
            Table: 'GroupMintRedeem_1d',
            Columns: [],
            Filter: [
                {
                    Type: 'FilterPredicate',
                    FilterType: 'Equals',
                    Column: 'group',
                    Value: groupAddress.toLowerCase(),
                },
            ],
            Limit: 30,
        },
    ]);

    return result.result.rows.map(([_, ts, m, r, s]) => ({
        timestamp: new Date(ts),
        minted: Number(m / 10 ** 18),
        redeemed: Number(r / 10 ** 18),
        supply: Number(s / 10 ** 18),
    }));
}

async function getMintRedeemPerHour(
    circlesRpc: CirclesRpc,
    groupAddress: Address
): Promise<Array<mintRedeem>> {
    const result = await circlesRpc.call<{
        columns: string[];
        rows: any[][];
    }>('circles_query', [
        {
            Namespace: 'V_CrcV2',
            Table: 'GroupMintRedeem_1h',
            Columns: [],
            Filter: [
                {
                    Type: 'FilterPredicate',
                    FilterType: 'Equals',
                    Column: 'group',
                    Value: groupAddress.toLowerCase(),
                },
            ],
            Limit: 24,
        },
    ]);

    return result.result.rows.map(([_, ts, v, m, r, s]) => ({
        timestamp: new Date(ts),
        minted: Number(m / 10 ** 18),
        redeemed: Number(r / 10 ** 18),
        supply: Number(s / 10 ** 18),
    }));
}

async function getGroupTokenHoldersBalance(
    circlesRpc: CirclesRpc,
    groupAddress: Address
) {
    const result = await circlesRpc.call<{
        columns: string[];
        rows: any[][];
    }>('circles_query', [
        {
            Namespace: 'V_CrcV2',
            Table: 'GroupTokenHoldersBalance',
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

    console.log('getGroupTokenHoldersBalance', result);

    // return result.result.rows.map(([_, ts, v, m, r, s]) => ({
    //     timestamp: new Date(ts),
    //     minted: Number(m),
    //     redeemed: Number(r),
    //     supply: Number(s),
    // }));
}