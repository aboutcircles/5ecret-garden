import {
  getGroupCollateral,
  getTreasuryAddress,
  getVaultAddress,
} from '$lib/utils/vault';
import { CirclesRpc } from '@aboutcircles/sdk-rpc';
import { uint256ToAddress } from '@aboutcircles/sdk-utils';
import type { Address } from '@aboutcircles/sdk-types';
import { formatEther } from 'ethers';

type memberCount = {
  timestamp: Date;
  count: number;
};

type mintRedeem = {
  timestamp: Date;
  minted: number;
  burned: number;
  supply: number;
};

type wrapUnwrap = {
  timestamp: Date;
  wrapAmount: number;
  unwrapAmount: number;
};

export type GroupMetrics = {
  memberCountPerHour?: Array<memberCount>;
  memberCountPerDay?: Array<memberCount>;
  collateralInTreasury?: Array<{ avatar: Address; amount: number }>;
  tokenHolderBalance?: Array<{
    holder: Address;
    demurragedTotalBalance: number;
    fractionalOwnership: number;
  }>;
  mintRedeemPerHour?: Array<mintRedeem>;
  mintRedeemPerDay?: Array<mintRedeem>;
  wrapUnwrapPerHour?: Array<wrapUnwrap>;
  wrapUnwrapPerDay?: Array<wrapUnwrap>;
  erc20Token?: Address;
  priceHistoryWeek?: Array<{ timestamp: Date; price: number }>;
  priceHistoryMonth?: Array<{ timestamp: Date; price: number }>;
  affiliateMembersCount?: number;
};

export let groupMetrics: GroupMetrics = $state({});
// @todo rework to use the new version
export async function fetchGroupMetrics(
  circlesRpc: CirclesRpc,
  groupAddress: Address,
  target: GroupMetrics
): Promise<void> {
  getMemberCount(circlesRpc, groupAddress, 'hour', '7 days').then((r) => {
    target.memberCountPerHour = r;
  });
  getMemberCount(circlesRpc, groupAddress, 'day', '30 days').then((r) => {
    target.memberCountPerDay = r;
  });
  getMintRedeem(circlesRpc, groupAddress, 'hour', '7 days').then((r) => {
    target.mintRedeemPerHour = r;
  });
  getMintRedeem(circlesRpc, groupAddress, 'day', '30 days').then((r) => {
    target.mintRedeemPerDay = r;
  });
  getWrapUnwrap(circlesRpc, groupAddress, 'hour', '7 days').then((r) => {
    target.wrapUnwrapPerHour = r;
  });
  getWrapUnwrap(circlesRpc, groupAddress, 'day', '30 days').then((r) => {
    target.wrapUnwrapPerDay = r;
  });
  getCollateralInTreasury(circlesRpc, groupAddress).then((r) => {
    target.collateralInTreasury = r;
  });
  getGroupTokenHoldersBalance(circlesRpc, groupAddress).then((r) => {
    target.tokenHolderBalance = r;
  });
  countCurrentAffiliateMembers(circlesRpc, groupAddress).then((r) => {
    target.affiliateMembersCount = r;
  });
  const token = await getERC20Token(circlesRpc, groupAddress);
  target.erc20Token = token;

  if (token) {
    const base = `/api/price/?group=${encodeURIComponent(token)}`;
    const [week, month] = await Promise.all([
      fetch(`${base}&period=7 days&resolution=hour`).then((r) =>
        r.ok ? r.json() : []
      ),
      fetch(`${base}&period=30 days&resolution=day`).then((r) =>
        r.ok ? r.json() : []
      ),
    ]);

    target.priceHistoryWeek = week?.map(
      (p: { timestamp: string; price: string }) => ({
        timestamp: new Date(p.timestamp),
        price: Number(p.price),
      })
    );

    target.priceHistoryMonth = month?.map(
      (p: { timestamp: string; price: string }) => ({
        timestamp: new Date(p.timestamp),
        price: Number(p.price),
      })
    );
  }
}

export async function initGroupMetricsStore(
  circlesRpc: CirclesRpc,
  groupAddress: Address
): Promise<void> {
  fetchGroupMetrics(circlesRpc, groupAddress, groupMetrics);
}

interface MemberCountRow {
  group: string;
  timestamp: string;
  count: number;
}

async function getMemberCount(
  circlesRpc: CirclesRpc,
  groupAddress: Address,
  resolution: 'hour' | 'day' = 'hour',
  period: string = '7 days'
): Promise<Array<memberCount>> {
  const table =
    resolution === 'hour' ? 'GroupMembersCount_1h' : 'GroupMembersCount_1d';
  const limit = resolution === 'hour' ? 24 * 7 : 30;
  const result = await circlesRpc.query.query<MemberCountRow>({
    Namespace: 'V_CrcV2',
    Table: table,
    Columns: [],
    Filter: [
      {
        Type: 'FilterPredicate',
        FilterType: 'Equals',
        Column: 'group',
        Value: groupAddress.toLowerCase(),
      },
    ],
    Order: [
      {
        Column: 'timestamp',
        SortOrder: 'DESC',
      },
    ],
    Limit: limit,
  });

  return result.reverse().map((row) => ({
    timestamp: new Date(row.timestamp),
    count: Number(row.count),
  }));
}

interface MintRedeemRow {
  group: string;
  timestamp: string;
  minted: bigint;
  redeemed: bigint;
  supply: bigint;
}

async function getMintRedeem(
  circlesRpc: CirclesRpc,
  groupAddress: Address,
  resolution: 'hour' | 'day' = 'hour',
  period: string = '7 days'
): Promise<Array<mintRedeem>> {
  const table =
    resolution === 'hour' ? 'GroupMintRedeem_1h' : 'GroupMintRedeem_1d';
  const limit = resolution === 'hour' ? 24 * 7 : 30;
  const result = await circlesRpc.query.query<MintRedeemRow>({
    Namespace: 'V_CrcV2',
    Table: table,
    Columns: [],
    Filter: [
      {
        Type: 'FilterPredicate',
        FilterType: 'Equals',
        Column: 'group',
        Value: groupAddress.toLowerCase(),
      },
    ],
    Order: [
      {
        Column: 'timestamp',
        SortOrder: 'DESC',
      },
    ],
    Limit: limit,
  });

  return result.reverse().map((row) => ({
    timestamp: new Date(row.timestamp),
    minted: Number(formatEther(row.minted)),
    burned: Number(-formatEther(row.redeemed)),
    supply: Number(formatEther(row.supply)),
  }));
}

interface WrapUnwrapRow {
  group: string;
  timestamp: string;
  totalAmount: bigint;
  totalTokens: number;
  wrapped: bigint;
  unwrapped: bigint;
}

async function getWrapUnwrap(
  circlesRpc: CirclesRpc,
  groupAddress: Address,
  resolution: 'hour' | 'day' = 'hour',
  period: string = '7 days'
): Promise<Array<wrapUnwrap>> {
  const table =
    resolution === 'hour' ? 'GroupWrapUnWrap_1h' : 'GroupWrapUnWrap_1d';
  const limit = resolution === 'hour' ? 24 * 7 : 30;
  const result = await circlesRpc.query.query<WrapUnwrapRow>({
    Namespace: 'V_CrcV2',
    Table: table,
    Columns: [],
    Filter: [
      {
        Type: 'FilterPredicate',
        FilterType: 'Equals',
        Column: 'group',
        Value: groupAddress.toLowerCase(),
      },
    ],
    Order: [
      {
        Column: 'timestamp',
        SortOrder: 'DESC',
      },
    ],
    Limit: limit,
  });

  return result.reverse().map((row) => ({
    timestamp: new Date(row.timestamp),
    wrapAmount: Number(formatEther(row.wrapped)),
    unwrapAmount: Number(-formatEther(row.unwrapped)),
  }));
}

async function getCollateralInTreasury(
  circlesRpc: CirclesRpc,
  groupAddress: Address
): Promise<Array<{ avatar: Address; amount: number }>> {
  const vaultAddress = await getVaultAddress(circlesRpc, groupAddress);

  const treasuryAddress = await getTreasuryAddress(circlesRpc, groupAddress);

  let balancesResult = await getGroupCollateral(
    circlesRpc,
    vaultAddress ?? treasuryAddress ?? ''
  );

  if (!balancesResult) {
    return [];
  }

  return balancesResult.map((row) => ({
    avatar: uint256ToAddress(BigInt(row.tokenId)),
    amount: Number(formatEther(row.demurragedTotalBalance)),
  }));
}

interface GroupCollateralByTokenRow {
  group: string;
  holder: Address;
  token: Address;
  demurragedTotalBalance: bigint;
  fractionalOwnership: number;
}

async function getGroupCollateralByToken(
  circlesRpc: CirclesRpc,
  groupAddress: Address
) {
  const result = await circlesRpc.query.query<GroupCollateralByTokenRow>({
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
    Order: [],
  });

  return result.map((row) => ({
    holder: row.holder,
    demurragedTotalBalance: Number(row.demurragedTotalBalance),
    fractionalOwnership: Number(row.fractionalOwnership),
  }));
}

interface GroupTokenHoldersBalanceRow {
  group: string;
  holder: Address;
  token: Address;
  demurragedTotalBalance: bigint;
  fractionalOwnership: number;
}

async function getGroupTokenHoldersBalance(
  circlesRpc: CirclesRpc,
  groupAddress: Address
) {
  const result = await circlesRpc.query.query<GroupTokenHoldersBalanceRow>({
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
    Order: [],
  });

  return result.map((row) => ({
    holder: row.holder,
    demurragedTotalBalance: Number(formatEther(row.demurragedTotalBalance)),
    fractionalOwnership: Number(row.fractionalOwnership),
  }));
}

interface TokenRow {
  tokenId: string;
  tokenOwner: Address;
  tokenType: string;
  version: number;
  circles: bigint;
  crc: bigint;
  demurragedStaticBalance: bigint;
  tokenAddress: Address;
}

async function getERC20Token(
  circlesRpc: CirclesRpc,
  groupAddress: Address
): Promise<Address | undefined> {
  const result = await circlesRpc.query.query<TokenRow>({
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
    Order: [],
  });

  return result[1]?.tokenAddress;
}

interface AffiliateGroupChangedRow {
  human: Address;
  newGroup: Address;
  oldGroup: Address;
  timestamp: number;
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
      Filter: [
        {
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
        },
      ],
      Order: [
        {
          Column: 'timestamp',
          SortOrder: 'DESC',
        },
      ],
      Limit: 1000,
    };

    if (cursor) {
      queryPayload.Cursor = cursor;
    }

    const rows = await circlesRpc.query.query<AffiliateGroupChangedRow>(queryPayload);

    for (const row of rows) {
      const human = row.human.toLowerCase();
      if (seen.has(human)) continue;

      seen.add(human);

      const rowNewGroup = row.newGroup.toLowerCase();
      const rowOldGroup = row.oldGroup.toLowerCase();
      if (
        rowNewGroup === groupAddress.toLowerCase() &&
        rowOldGroup !== groupAddress.toLowerCase()
      ) {
        count++;
      }
    }

    // For now, assume no pagination since the new API doesn't return cursor/hasMore
    // This may need to be updated based on the actual SDK implementation
    hasMore = false;
  }

  return count;
}
