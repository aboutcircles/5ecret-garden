import type { WrappedStaticPriceMap } from '$lib/shared/pricing/wrappedStaticPricing';

const BALANCER_V2_GNOSIS_SUBGRAPH_ID = 'EJezH1Cp31QkKPaBDerhVPRWsKVZLrDfzjrLqpmv6cGg';

type BalancerTokenRow = {
  id: string;
  latestUSDPrice: string | null;
};

type GraphQlError = {
  message: string;
};

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function parseUsdPrice(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function getBalancerV2GnosisSubgraphUrl(): string | null {
  const overrideUrl = process.env.BALANCER_V2_GNOSIS_SUBGRAPH_URL?.trim();
  if (overrideUrl) {
    return overrideUrl;
  }

  const apiKey = process.env.THE_GRAPH_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return `https://gateway-arbitrum.network.thegraph.com/api/${apiKey}/subgraphs/id/${BALANCER_V2_GNOSIS_SUBGRAPH_ID}`;
}

async function fetchTokenBatchPrices(addresses: string[]): Promise<BalancerTokenRow[]> {
  const subgraphUrl = getBalancerV2GnosisSubgraphUrl();
  if (!subgraphUrl) {
    return [];
  }

  const body = {
    query: `
      query TokenUsdPrices($ids: [String!]) {
        tokens(where: { id_in: $ids }) {
          id
          latestUSDPrice
        }
      }
    `,
    variables: {
      ids: addresses,
    },
  };

  const response = await fetch(subgraphUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Balancer subgraph HTTP ${response.status}: ${responseText}`);
  }

  const payload = (await response.json()) as {
    data?: { tokens?: BalancerTokenRow[] };
    errors?: GraphQlError[];
  };

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const message = payload.errors.map((error) => error.message).join('; ');
    throw new Error(`Balancer subgraph GraphQL error: ${message}`);
  }

  if (!payload.data?.tokens) {
    throw new Error('Balancer subgraph returned no token data');
  }

  return payload.data.tokens;
}

export async function getWrappedStaticUsdPrices(tokenAddresses: string[]): Promise<WrappedStaticPriceMap> {
  const uniqueAddresses = [...new Set(tokenAddresses.map(normalizeAddress))];

  const prices: WrappedStaticPriceMap = {};
  for (const address of uniqueAddresses) {
    prices[address] = {
      priceUsd: null,
      source: 'unpriced',
    };
  }

  const batches = chunk(uniqueAddresses, 100);
  try {
    for (const batch of batches) {
      if (batch.length === 0) continue;
      const rows = await fetchTokenBatchPrices(batch.map(normalizeAddress));
      for (const row of rows) {
        const address = normalizeAddress(row.id);
        prices[address] = {
          priceUsd: parseUsdPrice(row.latestUSDPrice),
          source: 'balancer-v2-subgraph-token-latestUSDPrice',
        };
      }
    }
  } catch (error) {
    console.warn('[wrapped-static-prices] subgraph lookup failed; falling back to unpriced', error);
  }

  return prices;
}
