import http from 'k6/http';
import { checkOk } from '../utils/checks.js';
import { endpointTag, withTags } from '../utils/tags.js';

export function getPath(pathfinderBaseUrl, path, payload, tags = {}) {
  const cleanBase = String(pathfinderBaseUrl || '').replace(/\/$/, '');
  const cleanPath = String(path || '/').startsWith('/') ? String(path || '/') : `/${String(path || '')}`;
  const url = `${cleanBase}${cleanPath}`;

  const res = http.post(
    url,
    JSON.stringify(payload),
    withTags(
      {
        component: tags.component || 'pathfinder_send',
        journey: tags.journey || 'send_pathfinder',
        endpoint: endpointTag('POST', cleanPath),
      },
      {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    ),
  );

  checkOk(res, 'pathfinder getPath ok');
  return res;
}

export function buildV2GetPathPayload(params) {
  return {
    source: params.from,
    sink: params.to,
    targetFlow: params.targetFlow,
    useWrappedBalances: params.useWrappedBalances ?? true,
    fromTokens: params.fromTokens,
    toTokens: params.toTokens,
    excludeFromTokens: params.excludeFromTokens,
    excludeToTokens: params.excludeToTokens,
    maxTransfers: params.maxTransfers,
  };
}
