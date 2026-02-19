import { fetchProfileDoc } from '../clients/profile.js';
import { getCommonTrust, getProfileByCidBatch } from '../clients/rpc.js';
import { pickDistinctPair, pickOne } from '../utils/random.js';

export function runProfileBrowseJourney(env, seed) {
  const cid = pickOne(seed?.profileCids || []);
  if (cid) {
    fetchProfileDoc(env.urls.profileServiceUrl, cid, {
      component: 'profile_read',
      journey: 'profile_browse',
    });
  }

  const [a, b] = pickDistinctPair(seed?.avatars || []);
  if (a && b) {
    getCommonTrust(env.urls.circlesRpcUrl, a, b, {
      component: 'profile_read',
      journey: 'profile_browse',
    });
  }

  const sample = (seed?.profileCids || []).slice(0, 10);
  if (sample.length > 0) {
    getProfileByCidBatch(env.urls.circlesRpcUrl, sample, {
      component: 'profile_read',
      journey: 'profile_browse',
    });
  }
}
