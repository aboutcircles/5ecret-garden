import http from 'k6/http';
import { checkOk } from '../utils/checks.js';
import { endpointTag, withTags } from '../utils/tags.js';

export function fetchSellers(marketApiBase, tags = {}) {
  const base = String(marketApiBase || '').replace(/\/$/, '');
  const url = `${base}/api/sellers`;
  const res = http.get(
    url,
    withTags({
      component: tags.component || 'market_bg',
      journey: tags.journey || 'market_background',
      endpoint: endpointTag('GET', '/api/sellers'),
    }),
  );
  checkOk(res, 'market sellers ok');
  const body = res.json();
  return Array.isArray(body) ? body : [];
}

export function fetchCatalogPage(marketApiBase, operator, avatars = [], chainId = 100, pageSize = 30, cursor = null, tags = {}) {
  const base = String(marketApiBase || '').replace(/\/$/, '');
  const qp = new URLSearchParams();
  for (const a of avatars) qp.append('avatars', String(a).toLowerCase());
  qp.set('chainId', String(chainId));
  qp.set('pageSize', String(pageSize));
  if (cursor) qp.set('cursor', cursor);

  const url = `${base}/api/operator/${String(operator).toLowerCase()}/catalog?${qp.toString()}`;
  const res = http.get(
    url,
    withTags({
      component: tags.component || 'market_bg',
      journey: tags.journey || 'market_background',
      endpoint: endpointTag('GET', '/api/operator/:operator/catalog'),
    }),
  );
  checkOk(res, 'market catalog ok');
  return res;
}
