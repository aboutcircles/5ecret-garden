import { fetchCatalogPage, fetchSellers } from '../clients/market.js';
import { searchProfiles } from '../clients/rpc.js';
import {
  extractAddressFromProfileRow,
  extractCidFromProfileRow,
  uniqueAddresses,
} from '../utils/data.js';

function uniqueStrings(items) {
  const out = [];
  const seen = new Set();
  for (const s of items || []) {
    const key = String(s || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function buildSeedData(env) {
  const avatars = [];
  const profileCids = [];

  for (let page = 0; page < env.seed.pages; page++) {
    const rows = searchProfiles(
      env.urls.circlesRpcUrl,
      env.seed.query,
      env.seed.pageSize,
      page * env.seed.pageSize,
      undefined,
      { component: 'profile_read', journey: 'seed' },
    );

    for (const r of rows) {
      const addr = extractAddressFromProfileRow(r);
      if (addr) avatars.push(addr);
      const cid = extractCidFromProfileRow(r);
      if (cid) profileCids.push(cid);
    }

    if (avatars.length >= env.seed.maxAvatars) break;
  }

  const discoveredAvatars = uniqueAddresses(avatars).slice(0, env.seed.maxAvatars);
  const discoveredCids = uniqueStrings(profileCids);

  let sellers = [];
  try {
    sellers = uniqueAddresses(fetchSellers(env.urls.marketApiBase, { component: 'market_bg', journey: 'seed' }));
  } catch {
    sellers = [];
  }

  if (sellers.length > 0) {
    const probe = fetchCatalogPage(
      env.urls.marketApiBase,
      env.urls.marketOperator,
      sellers.slice(0, 10),
      env.urls.marketChainId,
      20,
      null,
      { component: 'market_bg', journey: 'seed' },
    );
    const body = probe.json();
    const products = body?.catalog?.products || body?.products || body?.items || [];
    if (Array.isArray(products)) {
      for (const p of products) {
        const addr = extractAddressFromProfileRow(p?.seller ? { seller: p.seller } : p);
        if (addr) discoveredAvatars.push(addr);
      }
    }
  }

  const allAvatars = uniqueAddresses([...(env.seed.actors || []), ...discoveredAvatars]);
  const actors = allAvatars.slice(0, Math.min(25, allAvatars.length));

  const tokens = uniqueAddresses([...(env.seed.fromTokens || []), ...(env.seed.toTokens || [])]);

  return {
    avatars: allAvatars,
    actors,
    sellers,
    profileCids: uniqueStrings([...(env.seed.profileCids || []), ...discoveredCids]),
    fromTokens: tokens,
    toTokens: tokens,
  };
}
