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

type wrapUnwrap = {
    timestamp: Date;
    wrapAmount: number;
    unwrapAmount: number;
}

export type GroupMetrics = {
    memberCountPerHour?: Array<memberCount>;
    memberCountPerDay?: Array<memberCount>;
    collateralInTreasury?: Array<{ avatar: Address; amount: number }>;
    tokenHolderBalance?: Array<{ holder: Address, demurragedTotalBalance: number; fractionalOwnership: number }>;
    mintRedeemPerHour?: Array<mintRedeem>;
    mintRedeemPerDay?: Array<mintRedeem>;
    wrapUnwrapPerHour?: Array<wrapUnwrap>;
    wrapUnwrapPerDay?: Array<wrapUnwrap>;
    erc20Token?: Address;
    priceHistoryWeek?: Array<{ timestamp: Date; price: number }>;
    priceHistoryMonth?: Array<{ timestamp: Date; price: number }>;
}

export let groupMetrics: GroupMetrics = $state({});

export async function fetchGroupMetrics(
    circlesRpc: CirclesRpc,
    groupAddress: Address
): Promise<GroupMetrics> {
    const [
        memberCountPerHour,
        memberCountPerDay,
        mintRedeemPerHour,
        mintRedeemPerDay,
        wrapUnwrapPerHour,
        wrapUnwrapPerDay,
        collateralInTreasury,
        tokenHolderBalance,
        erc20Token,
    ] = await Promise.all([
        getMemberCount(circlesRpc, groupAddress, 'hour', '7 days'),
        getMemberCount(circlesRpc, groupAddress, 'day', '30 days'),
        getMintRedeem(circlesRpc, groupAddress, 'hour', '7 days'),
        getMintRedeem(circlesRpc, groupAddress, 'day', '30 days'),
        getWrapUnwrap(circlesRpc, groupAddress, 'hour', '7 days'),
        getWrapUnwrap(circlesRpc, groupAddress, 'day', '30 days'),
        getCollateralInTreasury(circlesRpc, groupAddress),
        getGroupTokenHoldersBalance(circlesRpc, groupAddress),
        getERC20Token(circlesRpc, groupAddress),
    ]);

    const base = '/api/price/' + '?group=' + encodeURIComponent(erc20Token ?? "")

    const [weekRes, monthRes] = await Promise.all([
        fetch(`${base}&period=7 days&resolution=hour`),
        fetch(`${base}&period=30 days&resolution=day`)
    ]);
    let priceHistoryWeek: {
        timestamp: Date;
        price: number;
    }[] = [];
    let priceHistoryMonth: {
        timestamp: Date;
        price: number;
    }[] = [];

    if (weekRes.status != 500 && monthRes.status != 500) {
        const rawWeek = await weekRes.json();
        priceHistoryWeek = rawWeek
            .map((p: { timestamp: string; price: string }) => ({
                timestamp: new Date(p.timestamp),
                price: Number(p.price),
            }))
            .filter((p: { price: number; }) => typeof p.price === 'number' && !isNaN(p.price));

        const rawMonth = await monthRes.json();
        priceHistoryMonth = rawMonth
            .map((p: { timestamp: string; price: string }) => ({
                timestamp: new Date(p.timestamp),
                price: Number(p.price),
            }))
            .filter((p: { price: number; }) => typeof p.price === 'number' && !isNaN(p.price));
    }


    return {
        memberCountPerHour,
        memberCountPerDay,
        mintRedeemPerHour,
        mintRedeemPerDay,
        wrapUnwrapPerHour,
        wrapUnwrapPerDay,
        collateralInTreasury,
        tokenHolderBalance,
        erc20Token,
        priceHistoryWeek,
        priceHistoryMonth,
    };
}

export async function initGroupMetricsStore(
    circlesRpc: CirclesRpc,
    groupAddress: Address
): Promise<void> {
    const data = await fetchGroupMetrics(circlesRpc, groupAddress);
    Object.assign(groupMetrics, data);
}

async function getMemberCount(
    circlesRpc: CirclesRpc,
    groupAddress: Address,
    resolution: 'hour' | 'day' = 'hour',
    period: string = '7 days'
): Promise<Array<memberCount>> {
    const table = resolution === 'hour' ? 'GroupMembersCount_1h' : 'GroupMembersCount_1d';
    const limit = resolution === 'hour' ? 24 * 7 : 30;
    const result = await circlesRpc.call<{
        columns: string[];
        rows: any[][];
    }>('circles_query', [
        {
            Namespace: 'V_CrcV2',
            Table: table,
            Columns: [],
            Filter: [
                {
                    Type: 'FilterPredicate',
                    FilterType: 'Equals',
                    Column: 'group',
                    Value: groupAddress.toLowerCase(),
                }
            ],
            Limit: limit
        },
    ]);

    return result.result.rows.map(([_, ts, v]) => ({
        timestamp: new Date(ts),
        count: Number(v),
    }));
}

async function getMintRedeem(
    circlesRpc: CirclesRpc,
    groupAddress: Address,
    resolution: 'hour' | 'day' = 'hour',
    period: string = '7 days'
): Promise<Array<mintRedeem>> {
    const table = resolution === 'hour' ? 'GroupMintRedeem_1h' : 'GroupMintRedeem_1d';
    const limit = resolution === 'hour' ? 24 * 7 : 30;
    const result = await circlesRpc.call<{
        columns: string[];
        rows: any[][];
    }>('circles_query', [
        {
            Namespace: 'V_CrcV2',
            Table: table,
            Columns: [],
            Filter: [
                {
                    Type: 'FilterPredicate',
                    FilterType: 'Equals',
                    Column: 'group',
                    Value: groupAddress.toLowerCase(),
                }
            ],
            Limit: limit
        },
    ]);

    return result.result.rows.map(([_, ts, m, r, s]) => ({
        timestamp: new Date(ts),
        minted: Number(formatEther(m)),
        redeemed: Number(formatEther(r)),
        supply: Number(formatEther(s)),
    }));
}

async function getWrapUnwrap(
    circlesRpc: CirclesRpc,
    groupAddress: Address,
    resolution: 'hour' | 'day' = 'hour',
    period: string = '7 days'
): Promise<Array<wrapUnwrap>> {
    const table = resolution === 'hour' ? 'GroupWrapUnWrap_1h' : 'GroupWrapUnWrap_1d';
    const limit = resolution === 'hour' ? 24 * 7 : 30;
    const result = await circlesRpc.call<{
        columns: string[];
        rows: any[][];
    }>('circles_query', [
        {
            Namespace: 'V_CrcV2',
            Table: table,
            Columns: [],
            Filter: [
                {
                    Type: 'FilterPredicate',
                    FilterType: 'Equals',
                    Column: 'group',
                    Value: groupAddress.toLowerCase(),
                }
            ],
            Limit: limit,
        },
    ]);

    return result.result.rows.map(([_, ts, ta, tt, w, u]) => ({
        timestamp: new Date(ts),
        wrapAmount: Number(formatEther(w)),
        unwrapAmount: Number(formatEther(u))
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

    return rows.map((row) => ({
        avatar: uint256ToAddress(BigInt(row[colId])),
        amount: Number(formatEther(row[colBal])),
        amountToRedeemInCircles: 0,
        amountToRedeem: 0n,
    }));
}

async function getGroupCollateralByToken(
    circlesRpc: CirclesRpc,
    groupAddress: Address
) {
    const result = await circlesRpc.call<{
        columns: string[];
        rows: any[][];
    }>('circles_query', [
        {
            Namespace: 'V_CrcV2',
            Table: 'GroupCollateralByToken',
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
        demurragedTotalBalance: Number(formatEther(d)),
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
