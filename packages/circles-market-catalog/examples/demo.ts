// Simple demo for @circles-market/catalog
// Run with: pnpm -w --filter @circles-market/catalog demo
// Requirements: Node 18+ (for global fetch)

import {CatalogClientImpl} from '../src/index';

function env(name: string, fallback?: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

async function main() {
  const marketApiBase = env('MARKET_API_BASE');
  const operator = env('OPERATOR');
  const sellersEnv = env('SELLERS');

  if (!marketApiBase || !operator) {
    // Provide helpful guidance
    console.error('[demo] Missing required env. Please provide:');
    console.error('  MARKET_API_BASE: Base URL of the market API (e.g. https://api.5ecret.agency/market)');
    console.error('  OPERATOR: Operator address that serves the aggregation endpoint');
    console.error('Optional:');
    console.error('  SELLERS: Comma-separated list of seller/avatar addresses to include');
    process.exit(1);
  }

  let sellers = sellersEnv ? sellersEnv.split(',').map((s) => s.trim()).filter(Boolean) : [];
  if (sellers.length === 0) {
    // Fallback to a known seller/avatar that typically has offers
    sellers = ['0xde374ece6fa50e781e81aac78e811b33d16912c7'];
    console.warn('[demo] SELLERS not provided; using fallback seller list:', sellers.join(','));
  }

  const client = new CatalogClientImpl(marketApiBase);

  console.log(`[demo] Fetching first catalog page...`);
  console.log(`[demo] operator=${operator}`);
  if (sellers.length) console.log(`[demo] sellers=${sellers.join(',')}`);

  try {
    const page = await client.fetchCatalogPage({
      operator,
      avatars: sellers,
      chainId: 100,
      pageSize: 25,
    });

    console.log(`[demo] HTTP status: ${page.status}`);
    console.log(`[demo] nextCursor: ${page.nextCursor ?? 'null'}`);
    console.log(`[demo] items: ${page.items.length}`);

    // Print a compact summary of first few items
    for (const [i, item] of page.items.slice(0, 10).entries()) {
      const offer = item.product?.offers?.[0];
      console.log(
        `#${i + 1} seller=${item.seller} sku=${item.product?.sku ?? '-'} name=${item.product?.name ?? '-'} price=${offer?.price ?? '-'} ${offer?.priceCurrency ?? ''}`
      );
    }

    if (page.items.length === 0) {
      console.log('[demo] No items returned. Try providing SELLERS env with known sellers.');
    }
  } catch (err) {
    console.error('[demo] Failed to fetch catalog page:', err);
    process.exit(2);
  }
}

main();
