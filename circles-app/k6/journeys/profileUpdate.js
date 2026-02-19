import { fetchProfileDoc, pinJsonLd } from '../clients/profile.js';
import { pickOne } from '../utils/random.js';

function mutateProfileDoc(doc) {
  const now = new Date().toISOString();
  const cloned = doc && typeof doc === 'object' ? JSON.parse(JSON.stringify(doc)) : {};
  if (!cloned.name) cloned.name = 'SG Load Test User';
  cloned.description = `Updated by SG k6 burn-in at ${now}`;
  cloned.lastUpdatedAt = Date.now();
  return cloned;
}

export function runProfileUpdateJourney(env, seed) {
  const cid = pickOne(seed?.profileCids || []);
  if (!cid) return;

  const res = fetchProfileDoc(env.urls.profileServiceUrl, cid, {
    component: 'profile_write',
    journey: 'profile_update',
  });

  let doc = null;
  try {
    doc = res?.json();
  } catch {
    doc = null;
  }

  const nextDoc = mutateProfileDoc(doc);
  pinJsonLd(env.urls.pinApiBase, nextDoc, {
    component: 'profile_write',
    journey: 'profile_update',
  });
}
