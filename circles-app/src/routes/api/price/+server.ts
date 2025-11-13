import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
  const groupToken = url.searchParams.get('group')?.toLowerCase();
  let resolution = url.searchParams.get('resolution') ?? 'hour';
  let period = url.searchParams.get('period') ?? '7 days';

  const validRes = new Set(['hour', 'day']);
  const validPer = new Set(['7 days', '30 days']);

  if (
    !groupToken ||
    !validRes.has(resolution) ||
    !validPer.has(period)
  ) {
    return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Return empty price history - integration with historical price data
  // can be added later via external API or blockchain indexer
  return new Response(JSON.stringify([]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
