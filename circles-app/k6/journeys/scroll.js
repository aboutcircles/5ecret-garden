import { getProfileByCidBatch, searchProfiles } from '../clients/rpc.js';
import { extractCidFromProfileRow, splitIntoChunks } from '../utils/data.js';
import { randInt } from '../utils/random.js';

function resolvePagesToScroll(env) {
  const mode = String(env.scroll.mode || 'mixed');
  if (mode === 'routine') return randInt(env.scroll.routineMin, env.scroll.routineMax);
  if (mode === 'deep') return randInt(env.scroll.deepMin, env.scroll.deepMax);

  // mixed: 80% routine, 15% medium, 5% deep
  const r = Math.random();
  if (r < 0.8) return randInt(env.scroll.routineMin, env.scroll.routineMax);
  if (r < 0.95) return randInt(env.scroll.mediumMin, env.scroll.mediumMax);
  return randInt(env.scroll.deepMin, env.scroll.deepMax);
}

export function runScrollJourney(env, seed) {
  const pages = resolvePagesToScroll(env);
  const baseOffset = randInt(0, env.seed.pageSize * Math.max(1, env.seed.pages));

  for (let i = 0; i < pages; i++) {
    const offset = baseOffset + i * env.scroll.pageSize;
    const rows = searchProfiles(
      env.urls.circlesRpcUrl,
      env.seed.query,
      env.scroll.pageSize,
      offset,
      undefined,
      { component: 'scroll', journey: 'scroll' },
    );

    if (!Array.isArray(rows) || rows.length === 0) break;

    const cids = rows
      .map((r) => extractCidFromProfileRow(r))
      .filter((c) => !!c)
      .slice(0, Math.max(1, env.scroll.enrichPerPage));

    for (const chunk of splitIntoChunks(cids, 50)) {
      getProfileByCidBatch(env.urls.circlesRpcUrl, chunk, {
        component: 'scroll',
        journey: 'scroll',
      });
    }
  }

  // Optional enrichment from seeded profiles to emulate item detail hover/focus behavior.
  const seededCids = (seed?.profileCids || []).slice(0, Math.max(1, env.scroll.enrichPerPage));
  if (seededCids.length > 0) {
    getProfileByCidBatch(env.urls.circlesRpcUrl, seededCids, {
      component: 'scroll',
      journey: 'scroll',
    });
  }
}
