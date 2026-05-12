import { isAddress } from 'ethers';
import type { Sdk } from '@circles-sdk/sdk';

export type PriceFallback = 'N/A' | 'Error';

export interface PriceConfig {
  endpoint?: string;
  tokenOut?: string;
  swapAmount?: string;
  chain?: 'GNOSIS';
  timeoutMs?: number;
  max429Retries?: number;
  retryDelayMs?: number;
}

export interface PriceResult {
  ok: boolean;
  tokenIn: string;
  tokenOut: string;
  rawReturnAmount?: string;
  pricePerToken?: number;
  formatted?: string;
  fallback?: PriceFallback;
  error?: string;
}

export const BALANCER_GRAPHQL_URL = 'https://api-v3.balancer.fi/graphql';
export const GNOSIS_WXDAI = '0xaf204776c7245bf4147c2612bf6e5972ee483701';
export const DEFAULT_SWAP_AMOUNT = '0.1';
export const DEFAULT_CHAIN: 'GNOSIS' = 'GNOSIS';
export const STATIC_WRAPPED_TOKEN_TYPE = 'CrcV2_ERC20WrapperDeployed_Inflationary';

const DEFAULTS: Required<PriceConfig> = {
  endpoint: import.meta.env.VITE_BALANCER_GRAPHQL_URL || BALANCER_GRAPHQL_URL,
  tokenOut: import.meta.env.VITE_BALANCER_WXDAI_ADDRESS || GNOSIS_WXDAI,
  swapAmount: import.meta.env.VITE_BALANCER_SWAP_AMOUNT || DEFAULT_SWAP_AMOUNT,
  chain: DEFAULT_CHAIN,
  timeoutMs: 12_000,
  max429Retries: 3,
  retryDelayMs: 2_000
};

type StaticWrappedCandidate = {
  tokenType?: string | null;
  isWrapped?: boolean | null;
  tokenAddress?: string | null;
};

type StaticWrappedLookupInput = StaticWrappedCandidate & {
  tokenOwner?: string | null;
  version?: number | null;
  sdk?: Sdk;
};

function isZeroAddress(addr?: string | null): boolean {
  if (!addr) return true;
  return addr.toLowerCase() === '0x0000000000000000000000000000000000000000';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function postGraphQLWith429Retry(
  endpoint: string,
  body: object,
  timeoutMs: number,
  max429Retries: number,
  retryDelayMs: number
): Promise<Response> {
  for (let attempt = 0; attempt < max429Retries; attempt++) {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      },
      timeoutMs
    );

    if (response.status !== 429) return response;
    await sleep(retryDelayMs);
  }

  return fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    timeoutMs
  );
}

export function buildSorGetSwapPathsQuery(tokenIn: string, cfg?: PriceConfig): string {
  const c = { ...DEFAULTS, ...(cfg ?? {}) };
  return `
    {
      sorGetSwapPaths(
        chain: ${c.chain},
        swapAmount: "${c.swapAmount}",
        swapType: EXACT_IN,
        tokenIn: "${tokenIn}",
        tokenOut: "${c.tokenOut}"
      ) {
        returnAmount
        effectivePrice
        protocolVersion
        effectivePriceReversed
        priceImpact {
          priceImpact
          error
        }
      }
    }
  `;
}

export function isStaticWrappedTokenBalanceCandidate(candidate: StaticWrappedCandidate): boolean {
  const tokenAddress = candidate?.tokenAddress ?? '';
  return (
    candidate?.tokenType === STATIC_WRAPPED_TOKEN_TYPE &&
    candidate?.isWrapped === true &&
    !isZeroAddress(tokenAddress) &&
    isAddress(tokenAddress)
  );
}

type RpcQueryResult = {
  result?: {
    columns?: string[];
    rows?: unknown[][];
  };
};

const WRAPPER_LOOKUP_TTL_MS = 60_000;
const wrapperLookupCache = new Map<string, { value?: string; expiresAt: number }>();
const wrapperLookupInFlight = new Map<string, Promise<string | undefined>>();

function asAddressOrUndefined(value: unknown): string | undefined {
  const v = String(value ?? '');
  return isAddress(v) && !isZeroAddress(v) ? v : undefined;
}

async function queryWrapperAddressesByAvatar(sdk: Sdk, avatar: string): Promise<string[]> {
  const response = await sdk.circlesRpc.call<RpcQueryResult>('circles_query', [
    {
      Namespace: 'CrcV2',
      Table: 'ERC20WrapperDeployed',
      Columns: ['erc20Wrapper', 'blockNumber', 'transactionIndex', 'logIndex'],
      Filter: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'avatar',
          Value: avatar.toLowerCase()
        }
      ],
      Order: [
        { Column: 'blockNumber', SortOrder: 'DESC' },
        { Column: 'transactionIndex', SortOrder: 'DESC' },
        { Column: 'logIndex', SortOrder: 'DESC' }
      ],
      Limit: 10
    }
  ]);

  const cols = response?.result?.columns ?? [];
  const rows = response?.result?.rows ?? [];
  const idxWrapper = cols.indexOf('erc20Wrapper');
  if (idxWrapper < 0) return [];

  const wrappers = rows
    .map((r) => asAddressOrUndefined(r[idxWrapper]))
    .filter((it): it is string => !!it);

  return Array.from(new Set(wrappers));
}

export async function resolveStaticWrappedTokenAddress(input: StaticWrappedLookupInput): Promise<string | undefined> {
  if (isStaticWrappedTokenBalanceCandidate(input)) {
    return input.tokenAddress ?? undefined;
  }

  if (!input?.sdk) return undefined;
  if (input?.version !== 2) return undefined;

  const owner = String(input?.tokenOwner ?? '').toLowerCase();
  if (!owner || isZeroAddress(owner) || !isAddress(owner)) {
    return undefined;
  }

  const now = Date.now();
  const cached = wrapperLookupCache.get(owner);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const inFlight = wrapperLookupInFlight.get(owner);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const wrapperCandidates = await queryWrapperAddressesByAvatar(input.sdk!, owner);
      if (wrapperCandidates.length === 0) {
        wrapperLookupCache.set(owner, { value: undefined, expiresAt: Date.now() + WRAPPER_LOOKUP_TTL_MS });
        return undefined;
      }

      for (const candidate of wrapperCandidates) {
        const tokenInfo = await input.sdk!.data.getTokenInfo(candidate as any);
        if (tokenInfo?.type === STATIC_WRAPPED_TOKEN_TYPE) {
          wrapperLookupCache.set(owner, { value: candidate, expiresAt: Date.now() + WRAPPER_LOOKUP_TTL_MS });
          return candidate;
        }
      }

      wrapperLookupCache.set(owner, { value: undefined, expiresAt: Date.now() + WRAPPER_LOOKUP_TTL_MS });
      return undefined;
    } catch {
      return undefined;
    }
  })().finally(() => {
    wrapperLookupInFlight.delete(owner);
  });

  wrapperLookupInFlight.set(owner, promise);
  return promise;
}

export async function quoteTokenPriceRaw(tokenIn: string, cfg?: PriceConfig): Promise<PriceResult> {
  const c = { ...DEFAULTS, ...(cfg ?? {}) };

  if (isZeroAddress(tokenIn) || !isAddress(tokenIn)) {
    return {
      ok: false,
      tokenIn,
      tokenOut: c.tokenOut,
      fallback: 'N/A',
      error: 'missing_or_invalid_address'
    };
  }

  try {
    const query = buildSorGetSwapPathsQuery(tokenIn, c);
    const response = await postGraphQLWith429Retry(
      c.endpoint,
      { query },
      c.timeoutMs,
      c.max429Retries,
      c.retryDelayMs
    );

    const data = await response.json();
    const returnAmount = data?.data?.sorGetSwapPaths?.returnAmount;

    if (!returnAmount) {
      return {
        ok: false,
        tokenIn,
        tokenOut: c.tokenOut,
        fallback: 'N/A',
        error: 'no_return_amount'
      };
    }

    const pricePerToken = Number(returnAmount) * 10;
    if (!Number.isFinite(pricePerToken)) {
      return {
        ok: false,
        tokenIn,
        tokenOut: c.tokenOut,
        rawReturnAmount: String(returnAmount),
        fallback: 'N/A',
        error: 'non_finite_price'
      };
    }

    return {
      ok: true,
      tokenIn,
      tokenOut: c.tokenOut,
      rawReturnAmount: String(returnAmount),
      pricePerToken,
      formatted: pricePerToken.toFixed(6)
    };
  } catch (e) {
    return {
      ok: false,
      tokenIn,
      tokenOut: c.tokenOut,
      fallback: 'Error',
      error: e instanceof Error ? e.message : 'unknown_error'
    };
  }
}

export async function getPriceProfileParity(tokenIn: string): Promise<string> {
  const result = await quoteTokenPriceRaw(tokenIn);
  if (result.ok) return result.formatted!;
  return result.fallback === 'Error' ? 'Error' : 'N/A';
}

export async function getPriceGroupParity(tokenIn: string): Promise<number | 'N/A'> {
  const result = await quoteTokenPriceRaw(tokenIn);
  if (!result.ok || result.pricePerToken == null) return 'N/A';
  return result.pricePerToken;
}

const PROFILE_CACHE_TTL_MS = 30_000;
const profileCache = new Map<string, { value: string; expiresAt: number }>();
const profileInFlight = new Map<string, Promise<string>>();

export async function getPriceProfileParityCached(tokenIn: string): Promise<string> {
  const key = String(tokenIn ?? '').toLowerCase();
  const now = Date.now();
  const cached = profileCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const running = profileInFlight.get(key);
  if (running) return running;

  const promise = getPriceProfileParity(tokenIn)
    .then((value) => {
      profileCache.set(key, { value, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
      return value;
    })
    .finally(() => {
      profileInFlight.delete(key);
    });

  profileInFlight.set(key, promise);
  return promise;
}