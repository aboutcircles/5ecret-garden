import type { CirclesRpc } from '@aboutcircles/sdk-rpc';

export type QuerySort = { Column: string; SortOrder: 'ASC' | 'DESC' };

export type QueryFilterPredicate = {
  Type: 'FilterPredicate';
  FilterType: string;
  Column: string;
  Value: string | number | boolean;
};

export type QueryConjunction = {
  Type: 'Conjunction';
  ConjunctionType: 'And' | 'Or';
  Predicates: QueryFilterPredicate[];
};

export type QueryFilter = QueryFilterPredicate | QueryConjunction;

export type QueryPayload = {
  Namespace: string;
  Table: string;
  Columns: string[];
  Filter: QueryFilter[];
  Order?: QuerySort[];
  Limit?: number;
  Cursor?: string;
};

export type RpcRowsResult = {
  columns: string[];
  rows: unknown[][];
  cursor?: string;
  hasMore?: boolean;
};

export async function queryBalancesByAccountAndTokenPage(
  circlesRpc: CirclesRpc,
  params: {
    filters: QueryFilter[];
    cursorColumn: 'tokenId' | 'account';
    limit: number;
    cursor?: string;
  }
): Promise<RpcRowsResult> {
  const columns = [params.cursorColumn, 'demurragedTotalBalance'];
  const order: QuerySort[] = [
    { Column: 'demurragedTotalBalance', SortOrder: 'DESC' },
    { Column: params.cursorColumn, SortOrder: 'ASC' },
  ];

  const payload: QueryPayload = {
    Namespace: 'V_CrcV2',
    Table: 'BalancesByAccountAndToken',
    Columns: columns,
    Filter: params.filters,
    Order: order,
    Limit: params.limit,
    Cursor: params.cursor,
  };

  const result: RpcRowsResult = await circlesRpc.client.call('circles_query', [payload]);

  return {
    columns: result?.columns ?? columns,
    rows: result?.rows ?? [],
    cursor: result?.cursor,
    hasMore: result?.hasMore,
  };
}

export async function queryVaultAddressByGroup(
  circlesRpc: CirclesRpc,
  groupAddress: string
): Promise<string | null> {
  const payload: QueryPayload = {
    Namespace: 'CrcV2',
    Table: 'CreateVault',
    Columns: ['vault'],
    Filter: [
      {
        Type: 'FilterPredicate',
        FilterType: 'Equals',
        Column: 'group',
        Value: groupAddress.toLowerCase(),
      },
    ],
    Order: [],
  };

  const result: RpcRowsResult = await circlesRpc.client.call('circles_query', [payload]);

  const rows = result?.rows ?? [];
  return rows.length > 0 ? (rows[0][0] as string) : null;
}

export async function queryTreasuryAddressByGroup(
  circlesRpc: CirclesRpc,
  groupAddress: string
): Promise<string | null> {
  const payload: QueryPayload = {
    Namespace: 'V_CrcV2',
    Table: 'Groups',
    Columns: ['treasury'],
    Filter: [
      {
        Type: 'FilterPredicate',
        FilterType: 'Equals',
        Column: 'group',
        Value: groupAddress.toLowerCase(),
      },
    ],
    Order: [],
  };

  const result: RpcRowsResult = await circlesRpc.client.call('circles_query', [payload]);

  const rows = result?.rows ?? [];
  return rows.length > 0 ? (rows[0][0] as string) : null;
}
