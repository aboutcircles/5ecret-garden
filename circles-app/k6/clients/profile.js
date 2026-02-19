import http from 'k6/http';
import { checkOk } from '../utils/checks.js';
import { endpointTag, withTags } from '../utils/tags.js';

export function fetchProfileDoc(profileServiceBase, cid, tags = {}) {
  if (!cid) return null;
  const base = String(profileServiceBase || '').replace(/\/$/, '');
  const url = `${base}/${encodeURIComponent(cid)}`;
  const res = http.get(
    url,
    withTags({
      component: tags.component || 'profile_read',
      journey: tags.journey || 'profile_browse',
      endpoint: endpointTag('GET', '/profiles/:cid'),
    }),
  );
  checkOk(res, 'profile doc get ok');
  return res;
}

export function pinJsonLd(pinApiBase, jsonLd, tags = {}) {
  const base = String(pinApiBase || '').replace(/\/$/, '');
  const url = `${base}/api/pin`;
  const res = http.post(
    url,
    JSON.stringify(jsonLd),
    withTags(
      {
        component: tags.component || 'profile_write',
        journey: tags.journey || 'profile_update',
        endpoint: endpointTag('POST', '/api/pin'),
      },
      {
        'Content-Type': 'application/ld+json; charset=utf-8',
        Accept: 'application/ld+json, application/json',
      },
    ),
  );
  checkOk(res, 'pin jsonld ok');
  return res;
}

export function pinMedia(pinApiBase, bytes, mime = 'application/octet-stream', tags = {}) {
  const base = String(pinApiBase || '').replace(/\/$/, '');
  const url = `${base}/api/pin-media`;
  const res = http.post(
    url,
    bytes,
    withTags(
      {
        component: tags.component || 'profile_write',
        journey: tags.journey || 'profile_update',
        endpoint: endpointTag('POST', '/api/pin-media'),
      },
      {
        'Content-Type': mime,
        Accept: 'application/json',
      },
    ),
  );
  checkOk(res, 'pin media ok');
  return res;
}
