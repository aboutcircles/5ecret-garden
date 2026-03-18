import type { RequestHandler } from './$types';
import { getWrappedStaticUsdPrices } from '$lib/server/pricing/balancerWrappedStaticPriceService';

type RequestBody = {
  addresses?: string[];
};

function normalizeInputAddresses(addresses: unknown): string[] {
  if (!Array.isArray(addresses)) {
    return [];
  }

  return addresses
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => /^0x[0-9a-f]{40}$/.test(value));
}

export const POST: RequestHandler = async (event) => {
  const { request } = event;
  let body: RequestBody | null = null;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const addresses = normalizeInputAddresses(body?.addresses);
  if (addresses.length === 0) {
    return new Response(JSON.stringify({ prices: {} }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const prices = await getWrappedStaticUsdPrices(addresses);
    return new Response(JSON.stringify({ prices }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('[wrapped-static-prices] failed to fetch prices', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch wrapped static prices',
      }),
      {
        status: 502,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
};
