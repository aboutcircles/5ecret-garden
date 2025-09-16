import type { CirclesRpc } from "@circles-sdk/data";

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
  const balancesResult = await circlesRpc.call<{
    columns: string[];
    rows: any[][];
  }>('circles_query', [
    {
      Namespace: 'V_CrcV2',
      Table: 'BalancesByAccountAndToken',
      Columns: ['tokenId', 'demurragedTotalBalance'],
      Filter: [
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
              Value: 10000000000000000
          }
      ],
      Order: [],
    },
  ]);

  if (!balancesResult?.result.rows || balancesResult.result.rows.length === 0) {
    return null;
  }
  return balancesResult.result;
}

export async function getGroupTokenHolders(
    circlesRpc: CirclesRpc,
    address: string
): Promise<{columns: string[], rows: any[][]} | null> {
    const balancesResult = await circlesRpc.call<{
        columns: string[];
        rows: any[][];
    }>('circles_query', [
        {
            Namespace: 'V_CrcV2',
            Table: 'BalancesByAccountAndToken',
            Columns: ['account', 'demurragedTotalBalance'],
            Filter: [
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
                    Value: 10000000000000000
                }
            ],
            Order: [],
        },
    ]);

    if (!balancesResult?.result.rows || balancesResult.result.rows.length === 0) {
        return null;
    }
    return balancesResult.result;
}