import { getGroupCollateral, getTreasuryAddress, getVaultAddress } from "$lib/utils/vault";
import { CirclesRpc } from "@circles-sdk/data";
import { uint256ToAddress, type Address } from "@circles-sdk/utils";
import { formatEther } from "ethers";

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
    memberCountPerHour?: Array<memberCount>;
    memberCountPerDay?: Array<memberCount>;
    collateralInTreasury: Array<{ avatar: Address; amount: number }> | undefined;
    tokenHolderBalance?: Array<{ holder: Address, demurragedTotalBalance: number; fractionalOwnership: number }>;
    mintRedeemPerHour: Array<mintRedeem> | undefined;
    mintRedeemPerDay: Array<mintRedeem> | undefined;
    erc20Token: Address | undefined;
    priceHistoryWeek?: Array<{ timestamp: Date; price: number }>;
    priceHistoryMonth?: Array<{ timestamp: Date; price: number }>;
}

export let groupMetrics: GroupMetrics = $state({
    memberCountPerHour: undefined,
    memberCountPerDay: undefined,
    collateralInTreasury: undefined,
    mintRedeemPerHour: undefined,
    mintRedeemPerDay: undefined,
    erc20Token: undefined,
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
    groupMetrics.tokenHolderBalance = await getGroupTokenHoldersBalance(circlesRpc, groupAddress);
    groupMetrics.erc20Token = await getERC20Token(circlesRpc, groupAddress);

    const base = '/api/price/' + '?group=' + encodeURIComponent(groupMetrics.erc20Token ?? "")

    const [weekRes, monthRes] = await Promise.all([
        fetch(`${base}&period=7 days&resolution=hour`),
        fetch(`${base}&period=30 days&resolution=day`)
    ]);

    const rawWeek = await weekRes.json();
    groupMetrics.priceHistoryWeek = rawWeek
        .map((p: { timestamp: string; price: string }) => ({
            timestamp: new Date(p.timestamp),
            price: Number(p.price),
        }))
        .filter((p: { price: number; }) => typeof p.price === 'number' && !isNaN(p.price));

    const rawMonth = await monthRes.json();
    groupMetrics.priceHistoryMonth = rawMonth
        .map((p: { timestamp: string; price: string }) => ({
            timestamp: new Date(p.timestamp),
            price: Number(p.price),
        }))
        .filter((p: { price: number; }) => typeof p.price === 'number' && !isNaN(p.price));
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
): Promise<Array<{ avatar: Address; amount: number }>> {
    const vaultAddress = await getVaultAddress(
        circlesRpc,
        groupAddress
    );

    const treasuryAddress = await getTreasuryAddress(
        circlesRpc,
        groupAddress
    );

    const balancesResult = await getGroupCollateral(
        circlesRpc,
        vaultAddress ?? treasuryAddress ?? ''
    );

    if (!balancesResult) {
        return [];
    }

    const { columns, rows } = balancesResult;
    const colId = columns.indexOf('tokenId');
    const colBal = columns.indexOf('demurragedTotalBalance');

    // Build up the table data
    return rows.map((row) => ({
        avatar: uint256ToAddress(BigInt(row[colId])),
        amount: Number(formatEther(row[colBal])),
        amountToRedeemInCircles: 0,
        amountToRedeem: 0n,
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

    return result.result.rows.map(([_, h, t, d, f]) => ({
        holder: h as Address,
        demurragedTotalBalance: Number(d),
        fractionalOwnership: Number(f),
    }));
}

async function getERC20Token(
    circlesRpc: CirclesRpc,
    groupAddress: Address
): Promise<Address | undefined> {
    const result = await circlesRpc.call<{
        columns: string[];
        rows: any[][];
    }>('circles_query', [
        {
            Namespace: 'V_Crc',
            Table: 'Tokens',
            Columns: [],
            Filter: [
                {
                    Type: 'FilterPredicate',
                    FilterType: 'Equals',
                    Column: 'tokenOwner',
                    Value: groupAddress.toLowerCase(),
                },
            ],
        },
    ]);

    return result.result.rows[1][7];
}