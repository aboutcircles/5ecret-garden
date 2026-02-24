import http from 'k6/http';
import { checkOk } from '../utils/checks.js';
import { endpointTag, withTags } from '../utils/tags.js';

function rpcPayload(method, params) {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  });
}

function safeJson(res) {
  try {
    return res.json();
  } catch {
    return null;
  }
}

export function rpcCall(url, method, params, tags = {}) {
  const endpoint = 'POST /';
  const res = http.post(
    url,
    rpcPayload(method, params),
    withTags(
      {
        component: tags.component || 'profile_read',
        journey: tags.journey || 'rpc',
        endpoint: endpointTag('POST', endpoint),
        rpc_method: method,
      },
      { 'Content-Type': 'application/json', Accept: 'application/json' },
    ),
  );
  checkOk(res, `rpc ${method} ok`);
  return res;
}

export function searchProfiles(rpcUrl, query, limit = 50, offset = 0, avatarTypes = undefined, tags = {}) {
  const res = rpcCall(rpcUrl, 'circles_searchProfiles', [query, limit, offset, avatarTypes], tags);
  const body = safeJson(res);
  return Array.isArray(body?.result) ? body.result : [];
}

export function getProfileByCidBatch(rpcUrl, cids, tags = {}) {
  if (!Array.isArray(cids) || cids.length === 0) return [];
  const res = rpcCall(rpcUrl, 'circles_getProfileByCidBatch', [cids], tags);
  const body = safeJson(res);
  return Array.isArray(body?.result) ? body.result : [];
}

export function getCommonTrust(rpcUrl, me, other, tags = {}) {
  if (!me || !other) return [];
  const res = rpcCall(rpcUrl, 'circles_getCommonTrust', [me, other], tags);
  const body = safeJson(res);
  return Array.isArray(body?.result) ? body.result : [];
}
