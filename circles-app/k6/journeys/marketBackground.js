import { fetchCatalogPage, fetchSellers } from '../clients/market.js';
import { pickOne } from '../utils/random.js';

export function runMarketBackgroundJourney(env, seed) {
  const sellers = seed?.sellers?.length ? seed.sellers : fetchSellers(env.urls.marketApiBase, {
    component: 'market_bg',
    journey: 'market_background',
  });

  const seller = pickOne(sellers || []);
  if (!seller) return;

  fetchCatalogPage(
    env.urls.marketApiBase,
    env.urls.marketOperator,
    [seller],
    env.urls.marketChainId,
    20,
    null,
    {
      component: 'market_bg',
      journey: 'market_background',
    },
  );
}
