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

export async function getVaultBalances(
  circlesRpc: CirclesRpc,
  vaultAddress: string
): Promise<{ columns: string[]; rows: any[][] } | null> {
  const balancesResult = await circlesRpc.call<{
    columns: string[];
    rows: any[][];
  }>('circles_query', [
    {
      Namespace: 'V_CrcV2',
      Table: 'GroupVaultBalancesByToken',
      Columns: ['id', 'balance'],
      Filter: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'vault',
          Value: vaultAddress.toLowerCase(),
        },
      ],
      Order: [],
    },
  ]);

  if (!balancesResult?.result.rows || balancesResult.result.rows.length === 0) {
    return null;
  }
  return balancesResult.result;
}
