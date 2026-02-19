import type { CirclesRpc } from '@aboutcircles/sdk-rpc';
import type { Address } from '@aboutcircles/sdk-types';
import type {
  QueryConjunction,
  QueryFilterPredicate,
  QueryPayload,
  RpcRowsResult,
} from '$lib/shared/data/circles/vaultQueries';

const eq = (column: string, value: string): QueryFilterPredicate => ({
  Type: 'FilterPredicate',
  FilterType: 'Equals',
  Column: column,
  Value: value,
});

const or = (...predicates: QueryFilterPredicate[]): QueryConjunction => ({
  Type: 'Conjunction',
  ConjunctionType: 'Or',
  Predicates: predicates,
});

async function queryRows(
  circlesRpc: CirclesRpc,
  payload: QueryPayload
): Promise<RpcRowsResult> {
  const result = await circlesRpc.call<RpcRowsResult>('circles_query', [payload]);
  return {
    columns: result?.result?.columns ?? [],
    rows: result?.result?.rows ?? [],
    cursor: result?.result?.cursor,
    hasMore: result?.result?.hasMore,
  };
}

export async function queryGroupMembersCountSeries(
  circlesRpc: CirclesRpc,
  groupAddress: Address,
  resolution: 'hour' | 'day'
): Promise<RpcRowsResult> {
  const table = resolution === 'hour' ? 'GroupMembersCount_1h' : 'GroupMembersCount_1d';
  const limit = resolution === 'hour' ? 24 * 7 : 30;

  const payload: QueryPayload = {
    Namespace: 'V_CrcV2',
    Table: table,
    Columns: [],
    Filter: [eq('group', groupAddress.toLowerCase())],
    Order: [{ Column: 'timestamp', SortOrder: 'DESC' }],
    Limit: limit,
  };

  return await queryRows(circlesRpc, payload);
}

export async function queryGroupMintRedeemSeries(
  circlesRpc: CirclesRpc,
  groupAddress: Address,
  resolution: 'hour' | 'day'
): Promise<RpcRowsResult> {
  const table = resolution === 'hour' ? 'GroupMintRedeem_1h' : 'GroupMintRedeem_1d';
  const limit = resolution === 'hour' ? 24 * 7 : 30;

  const payload: QueryPayload = {
    Namespace: 'V_CrcV2',
    Table: table,
    Columns: [],
    Filter: [eq('group', groupAddress.toLowerCase())],
    Order: [{ Column: 'timestamp', SortOrder: 'DESC' }],
    Limit: limit,
  };

  return await queryRows(circlesRpc, payload);
}

export async function queryGroupWrapUnwrapSeries(
  circlesRpc: CirclesRpc,
  groupAddress: Address,
  resolution: 'hour' | 'day'
): Promise<RpcRowsResult> {
  const table = resolution === 'hour' ? 'GroupWrapUnWrap_1h' : 'GroupWrapUnWrap_1d';
  const limit = resolution === 'hour' ? 24 * 7 : 30;

  const payload: QueryPayload = {
    Namespace: 'V_CrcV2',
    Table: table,
    Columns: [],
    Filter: [eq('group', groupAddress.toLowerCase())],
    Order: [{ Column: 'timestamp', SortOrder: 'DESC' }],
    Limit: limit,
  };

  return await queryRows(circlesRpc, payload);
}

export async function queryGroupTokenHoldersBalance(
  circlesRpc: CirclesRpc,
  groupAddress: Address
): Promise<RpcRowsResult> {
  const payload: QueryPayload = {
    Namespace: 'V_CrcV2',
    Table: 'GroupTokenHoldersBalance',
    Columns: [],
    Filter: [eq('group', groupAddress.toLowerCase())],
  };

  return await queryRows(circlesRpc, payload);
}

export async function queryGroupErc20Token(
  circlesRpc: CirclesRpc,
  groupAddress: Address
): Promise<RpcRowsResult> {
  const payload: QueryPayload = {
    Namespace: 'V_Crc',
    Table: 'Tokens',
    Columns: [],
    Filter: [eq('tokenOwner', groupAddress.toLowerCase())],
  };

  return await queryRows(circlesRpc, payload);
}

export async function queryAffiliateGroupChangedPage(
  circlesRpc: CirclesRpc,
  groupAddress: Address,
  cursor?: string
): Promise<RpcRowsResult> {
  const queryPayload: QueryPayload = {
    Namespace: 'CrcV2',
    Table: 'AffiliateGroupChanged',
    Columns: ['human', 'newGroup', 'oldGroup', 'timestamp'],
    Filter: [
      or(
        eq('oldGroup', groupAddress.toLowerCase()),
        eq('newGroup', groupAddress.toLowerCase())
      ),
    ],
    Order: [{ Column: 'timestamp', SortOrder: 'DESC' }],
    Limit: 1000,
  };

  if (cursor) {
    queryPayload.Cursor = cursor;
  }

  return await queryRows(circlesRpc, queryPayload);
}
