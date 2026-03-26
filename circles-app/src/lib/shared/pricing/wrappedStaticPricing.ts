import type { TokenBalanceRow } from '@circles-sdk/data';

export const WRAPPED_STATIC_TOKEN_TYPE = 'CrcV2_ERC20WrapperDeployed_Inflationary';

export type WrappedStaticPriceResult = {
  priceUsd: number | null;
  source: string;
};

export type WrappedStaticPriceMap = Record<string, WrappedStaticPriceResult>;

export function isWrappedStaticToken(balance: TokenBalanceRow): boolean {
  return balance.tokenType === WRAPPED_STATIC_TOKEN_TYPE && balance.isErc20 === true;
}

export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

export function pickWrappedStaticTokenAddresses(balances: TokenBalanceRow[]): string[] {
  const unique = new Set<string>();

  for (const balance of balances) {
    if (!isWrappedStaticToken(balance)) {
      continue;
    }
    unique.add(normalizeAddress(balance.tokenAddress));
  }

  return [...unique];
}

export function formatWrappedStaticUsdPrice(priceUsd: number | null | undefined): string | null {
  if (priceUsd == null || !Number.isFinite(priceUsd) || priceUsd <= 0) {
    return null;
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: priceUsd < 1 ? 4 : 2,
  }).format(priceUsd);
}
