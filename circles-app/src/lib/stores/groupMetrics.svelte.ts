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
    burned: number;
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
    affiliateMembersCount?: number;
}

export let groupMetrics: GroupMetrics = $state({});

export async function fetchGroupMetrics(
    circlesRpc: CirclesRpc,
    groupAddress: Address,
    target: GroupMetrics
): Promise<void> {
    getMemberCount(circlesRpc, groupAddress, 'hour', '7 days').then(r => {
        target.memberCountPerHour = r
    });
    getMemberCount(circlesRpc, groupAddress, 'day', '30 days').then(r => {
        target.memberCountPerDay = r
    });
    getMintRedeem(circlesRpc, groupAddress, 'hour', '7 days').then(r => {
        target.mintRedeemPerHour = r
    });
    getMintRedeem(circlesRpc, groupAddress, 'day', '30 days').then(r => {
        target.mintRedeemPerDay = r
    });
    getWrapUnwrap(circlesRpc, groupAddress, 'hour', '7 days').then(r => {
        target.wrapUnwrapPerHour = r
    });
    getWrapUnwrap(circlesRpc, groupAddress, 'day', '30 days').then(r => {
        target.wrapUnwrapPerDay = r
    });
    getCollateralInTreasury(circlesRpc, groupAddress).then(r => {
        target.collateralInTreasury = r
    });
    getGroupTokenHoldersBalance(circlesRpc, groupAddress).then(r => {
        target.tokenHolderBalance = r
    });
    countCurrentAffiliateMembers(circlesRpc, groupAddress).then(r => {
        target.affiliateMembersCount = r
    });
    const token = await getERC20Token(circlesRpc, groupAddress);
    target.erc20Token = token;

    if (token) {
        const base = `/api/price/?group=${encodeURIComponent(token)}`;
        const [week, month] = await Promise.all([
            fetch(`${base}&period=7 days&resolution=hour`).then(r => r.ok ? r.json() : []),
            fetch(`${base}&period=30 days&resolution=day`).then(r => r.ok ? r.json() : []),
        ]);

        target.priceHistoryWeek = week?.map((p: { timestamp: string; price: string }) => ({
            timestamp: new Date(p.timestamp),
            price: Number(p.price)
        }));

        target.priceHistoryMonth = month?.map((p: { timestamp: string; price: string }) => ({
            timestamp: new Date(p.timestamp),
            price: Number(p.price)
        }));
    }
}


export async function initGroupMetricsStore(
    circlesRpc: CirclesRpc,
    groupAddress: Address
): Promise<void> {
    fetchGroupMetrics(circlesRpc, groupAddress, groupMetrics);
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
            Order: [
                {
                    Column: 'timestamp',
                    SortOrder: 'DESC'
                },
            ],
            Limit: limit
        },
    ]);

    return result.result.rows.reverse().map(([_, ts, v]) => ({
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
            Order: [
                {
                    Column: 'timestamp',
                    SortOrder: 'DESC'
                },
            ],
            Limit: limit
        },
    ]);

    return result.result.rows.reverse().map(([_, ts, m, r, s]) => ({
        timestamp: new Date(ts),
        minted: Number(formatEther(m)),
        burned: Number(-formatEther(r)),
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
            Order: [
                {
                    Column: 'timestamp',
                    SortOrder: 'DESC'
                },
            ],
            Limit: limit,
        },
    ]);

    return result.result.rows.reverse().map(([_, ts, ta, tt, w, u]) => ({
        timestamp: new Date(ts),
        wrapAmount: Number(formatEther(w)),
        unwrapAmount: Number(-formatEther(u))
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

    let balancesResult = await getGroupCollateral(
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

export async function countCurrentAffiliateMembers(
    circlesRpc: CirclesRpc,
    groupAddress: Address
): Promise<number> {
    const seen = new Set<string>();
    let count = 0;

    let cursor: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {

        const queryPayload: any = {
            Namespace: 'CrcV2',
            Table: 'AffiliateGroupChanged',
            Columns: ['human', 'newGroup', 'oldGroup', 'timestamp'],
            Filter: [{
                Type: 'Conjunction',
                ConjunctionType: 'Or',
                Predicates: [
                    {
                        Type: 'FilterPredicate',
                        FilterType: 'Equals',
                        Column: 'oldGroup',
                        Value: groupAddress.toLowerCase(),
                    },
                    {
                        Type: 'FilterPredicate',
                        FilterType: 'Equals',
                        Column: 'newGroup',
                        Value: groupAddress.toLowerCase(),
                    },
                ],
            }],
            Order: [
                {
                    Column: 'timestamp',
                    SortOrder: 'DESC'
                },
            ],
            Limit: 1000,
        };

        if (cursor) {
            queryPayload.Cursor = cursor;
        }

        const resp = await circlesRpc.call<{
            columns: string[];
            rows: any[][];
            cursor?: string;
            hasMore?: boolean;
        }>('circles_query', [queryPayload]);

        const { rows, cursor: nextCursor, hasMore: more } = resp.result;

        for (const row of rows) {
            const human = (row[0] as string).toLowerCase();
            if (seen.has(human)) continue;

            seen.add(human);

            const rowNewGroup = (row[1] as string).toLowerCase();
            const rowOldGroup = (row[2] as string).toLowerCase();
            if (rowNewGroup === groupAddress.toLowerCase() && rowOldGroup !== groupAddress.toLowerCase()) {
                count++;
            }
        }

        hasMore = Boolean(more);
        cursor = nextCursor;
    }

    return count;
}