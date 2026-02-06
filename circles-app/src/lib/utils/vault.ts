import type { CirclesRpc } from "@circles-sdk/data";

const BALANCES_PAGE_SIZE = 1000;
const MIN_BALANCE_FILTER = 10000000000000000;

async function queryBalancesPaginated(
  circlesRpc: CirclesRpc,
  filters: Array<Record<string, any>>,
  cursorColumn: 'tokenId' | 'account'
): Promise<{ columns: string[]; rows: any[][] } | null> {
  const columns = [cursorColumn, 'demurragedTotalBalance'];
  const order = [
    { Column: 'demurragedTotalBalance', SortOrder: 'DESC' },
    { Column: cursorColumn, SortOrder: 'ASC' },
  ];

  let cursor: string | undefined = undefined;
  let allRows: any[][] = [];
  let resultColumns: string[] = [];

  while (true) {
    const balancesResult = await circlesRpc.call<{
      columns: string[];
      rows: any[][];
      cursor?: string;
      hasMore?: boolean;
    }>('circles_query', [
      {
        Namespace: 'V_CrcV2',
        Table: 'BalancesByAccountAndToken',
        Columns: columns,
        Filter: filters,
        Order: order,
        Limit: BALANCES_PAGE_SIZE,
        Cursor: cursor,
      },
    ]);

    const rows = balancesResult?.result.rows ?? [];
    if (!resultColumns.length) {
      resultColumns = balancesResult?.result.columns ?? columns;
    }

    if (rows.length === 0) {
      break;
    }

    allRows = allRows.concat(rows);

    const hasMore = Boolean(balancesResult?.result.hasMore);
    const nextCursor = balancesResult?.result.cursor;

    if (!hasMore || !nextCursor) {
      if (rows.length < BALANCES_PAGE_SIZE) {
        break;
      }
      break;
    }

    cursor = nextCursor;
  }

  if (allRows.length === 0) {
    return null;
  }

  return {
    columns: resultColumns.length ? resultColumns : columns,
    rows: allRows,
  };
}

export async function getVaultAddress(
  circlesRpc: CirclesRpc,
  tokenOwner: string
): Promise<string | null> {
  const vaultResult = await circlesRpc.call<{
    columns: string[];
    rows: any[][];
  }>('circles_query', [
    {
      Namespace: 'CrcV2',
      Table: 'CreateVault',
      Columns: ['vault'],
      Filter: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'group',
          Value: tokenOwner.toLowerCase(),
        },
      ],
      Order: [],
    },
  ]);

  if (!vaultResult?.result.rows || vaultResult.result.rows.length === 0) {
    return null;
  }
  return vaultResult.result.rows[0][0];
}

export async function getTreasuryAddress(
  circlesRpc: CirclesRpc,
  tokenOwner: string
): Promise<string | null> {
  const treasuryResult = await circlesRpc.call<{
    columns: string[];
    rows: any[][];
  }>('circles_query', [
    {
      Namespace: 'V_CrcV2',
      Table: 'Groups',
      Columns: ['treasury'],
      Filter: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'group',
          Value: tokenOwner.toLowerCase(),
        },
      ],
      Order: [],
    },
  ]);

  if (!treasuryResult?.result.rows || treasuryResult.result.rows.length === 0) {
    return null;
  }
  return treasuryResult.result.rows[0][0];
}

export async function getGroupCollateral(
  circlesRpc: CirclesRpc,
  address: string
): Promise<{ columns: string[]; rows: any[][] } | null> {
  return await queryBalancesPaginated(
    circlesRpc,
    [
      {
        Type: 'FilterPredicate',
        FilterType: 'Equals',
        Column: 'account',
        Value: address.toLowerCase(),
      },
      {
        Type: 'FilterPredicate',
        FilterType: 'GreaterThanOrEquals',
        Column: 'demurragedTotalBalance',
        Value: MIN_BALANCE_FILTER,
      },
    ],
    'tokenId'
  );
}

export async function getAccountHoldings(
  circlesRpc: CirclesRpc,
  accountAddress: string
): Promise<{ columns: string[]; rows: any[][] } | null> {
  return await queryBalancesPaginated(
    circlesRpc,
    [
      {
        Type: 'FilterPredicate',
        FilterType: 'Equals',
        Column: 'account',
        Value: accountAddress.toLowerCase(),
      },
      {
        Type: 'FilterPredicate',
        FilterType: 'GreaterThanOrEquals',
        Column: 'demurragedTotalBalance',
        Value: MIN_BALANCE_FILTER,
      },
    ],
    'tokenId'
  );
}

export async function getGroupTokenHolders(
    circlesRpc: CirclesRpc,
    address: string
): Promise<{columns: string[], rows: any[][]} | null> {
    return await queryBalancesPaginated(
      circlesRpc,
      [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'tokenAddress',
          Value: address.toLowerCase(),
        },
        {
          Type: 'FilterPredicate',
          FilterType: 'GreaterThanOrEquals',
          Column: 'demurragedTotalBalance',
          Value: MIN_BALANCE_FILTER,
        },
      ],
      'account'
    );
}