import { getGroupCollateral, getTreasuryAddress, getVaultAddress } from "$lib/shared/utils/vault";
import type { CirclesRpc } from "@aboutcircles/sdk-types";
import type { Address } from "@aboutcircles/sdk-types";
import { uint256ToAddress } from "@aboutcircles/sdk-utils";
import { formatEther, type BigNumberish } from "ethers";
import {
    queryAffiliateGroupChangedPage,
    queryGroupErc20Token,
    queryGroupMembersCountSeries,
    queryGroupMintRedeemSeries,
    queryGroupTokenHoldersBalance,
    queryGroupWrapUnwrapSeries,
} from '$lib/shared/data/circles/groupMetricsQueries';

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

function toDate(value: unknown): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') return new Date(value);
    return new Date(Number(value));
}

function toBigNumberish(value: unknown): BigNumberish {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
        return value;
    }
    return String(value);
}

async function getMemberCount(
    circlesRpc: CirclesRpc,
    groupAddress: Address,
    resolution: 'hour' | 'day' = 'hour',
    period: string = '7 days'
): Promise<Array<memberCount>> {
    const result = await queryGroupMembersCountSeries(circlesRpc, groupAddress, resolution);
    const rows = result.rows as Array<[unknown, string | number | Date, unknown]>;

    return rows.reverse().map(([_, ts, v]) => ({
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
    const result = await queryGroupMintRedeemSeries(circlesRpc, groupAddress, resolution);
    const rows = result.rows as Array<[unknown, string | number | Date, unknown, unknown, unknown]>;

    return rows.reverse().map(([_, ts, m, r, s]) => ({
        timestamp: toDate(ts),
        minted: Number(formatEther(toBigNumberish(m))),
        burned: Number(-formatEther(toBigNumberish(r))),
        supply: Number(formatEther(toBigNumberish(s))),
    }));
}

async function getWrapUnwrap(
    circlesRpc: CirclesRpc,
    groupAddress: Address,
    resolution: 'hour' | 'day' = 'hour',
    period: string = '7 days'
): Promise<Array<wrapUnwrap>> {
    const result = await queryGroupWrapUnwrapSeries(circlesRpc, groupAddress, resolution);
    const rows = result.rows as Array<[unknown, string | number | Date, unknown, unknown, unknown, unknown]>;

    return rows.reverse().map(([_, ts, ta, tt, w, u]) => ({
        timestamp: toDate(ts),
        wrapAmount: Number(formatEther(toBigNumberish(w))),
        unwrapAmount: Number(-formatEther(toBigNumberish(u)))
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

async function getGroupTokenHoldersBalance(
    circlesRpc: CirclesRpc,
    groupAddress: Address
) {
    const result = await queryGroupTokenHoldersBalance(circlesRpc, groupAddress);
    const rows = result.rows as Array<[unknown, unknown, unknown, unknown, unknown]>;

    return rows.map(([_, h, t, d, f]) => ({
        holder: String(h) as Address,
        demurragedTotalBalance: Number(formatEther(toBigNumberish(d))),
        fractionalOwnership: Number(f),
    }));
}

async function getERC20Token(
    circlesRpc: CirclesRpc,
    groupAddress: Address
): Promise<Address | undefined> {
    const result = await queryGroupErc20Token(circlesRpc, groupAddress);
    const token = result.rows[1]?.[7];

    return typeof token === 'string' ? (token as Address) : undefined;
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

        const resp = await queryAffiliateGroupChangedPage(circlesRpc, groupAddress, cursor);

        const { rows, cursor: nextCursor, hasMore: more } = resp;

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