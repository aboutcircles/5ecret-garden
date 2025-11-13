import type { CirclesRpc } from '@aboutcircles/sdk-rpc';

interface VaultRow {
  vault: string;
}

export async function getVaultAddress(
  circlesRpc: CirclesRpc,
  tokenOwner: string
): Promise<string | null> {
  const vaultResult = await circlesRpc.query.query<VaultRow>({
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
  });

  if (!vaultResult || vaultResult.length === 0) {
    return null;
  }
  return vaultResult[0].vault;
}

interface TreasuryRow {
  treasury: string;
}

export async function getTreasuryAddress(
  circlesRpc: CirclesRpc,
  tokenOwner: string
): Promise<string | null> {
  const treasuryResult = await circlesRpc.query.query<TreasuryRow>({
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
  });

  if (!treasuryResult || treasuryResult.length === 0) {
    return null;
  }
  return treasuryResult[0].treasury;
}

interface CollateralRow {
  tokenId: string;
  demurragedTotalBalance: bigint;
}

export async function getGroupCollateral(
  circlesRpc: CirclesRpc,
  address: string
): Promise<CollateralRow[] | null> {
  const balancesResult = await circlesRpc.query.query<CollateralRow>({
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
        FilterType: 'GreaterOrEqualThan',
        Column: 'demurragedTotalBalance',
        Value: 10000000000000000,
      },
    ],
    Order: [],
  });

  if (!balancesResult || balancesResult.length === 0) {
    return null;
  }
  return balancesResult;
}

interface TokenHolderRow {
  account: string;
  demurragedTotalBalance: bigint;
}

export async function getGroupTokenHolders(
  circlesRpc: CirclesRpc,
  address: string
): Promise<TokenHolderRow[] | null> {
  const balancesResult = await circlesRpc.query.query<TokenHolderRow>({
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
        FilterType: 'GreaterOrEqualThan',
        Column: 'demurragedTotalBalance',
        Value: 10000000000000000,
      },
    ],
    Order: [],
  });

  if (!balancesResult || balancesResult.length === 0) {
    return null;
  }
  return balancesResult;
}
