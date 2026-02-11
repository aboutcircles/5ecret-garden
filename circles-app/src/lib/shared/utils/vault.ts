import type { CirclesRpc } from "@circles-sdk/data";
import {
  queryBalancesByAccountAndTokenPage,
  queryTreasuryAddressByGroup,
  queryVaultAddressByGroup,
} from '$lib/shared/data/circles/vaultQueries';

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
    const balancesResult = await queryBalancesByAccountAndTokenPage(circlesRpc, {
      filters,
      cursorColumn,
      limit: BALANCES_PAGE_SIZE,
      cursor,
    });

    const rows = balancesResult.rows ?? [];
    if (!resultColumns.length) {
      resultColumns = balancesResult.columns ?? columns;
    }

    if (rows.length === 0) {
      break;
    }

    allRows = allRows.concat(rows);

    const hasMore = Boolean(balancesResult.hasMore);
    const nextCursor = balancesResult.cursor;

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
  return await queryVaultAddressByGroup(circlesRpc, tokenOwner);
}

export async function getTreasuryAddress(
  circlesRpc: CirclesRpc,
  tokenOwner: string
): Promise<string | null> {
  return await queryTreasuryAddressByGroup(circlesRpc, tokenOwner);
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