import { buildV2GetPathPayload, getPath } from '../clients/pathfinder.js';
import { pickDistinctPair, pickOne, randInt } from '../utils/random.js';

export function runSendPathfinderJourney(env, seed) {
  const source = pickOne(seed?.actors || seed?.avatars || []);
  const [fallbackA, fallbackB] = pickDistinctPair(seed?.avatars || []);
  const sink = pickOne((seed?.avatars || []).filter((a) => a !== source), fallbackB || fallbackA);

  if (!source || !sink) return;

  const payload = buildV2GetPathPayload({
    from: source,
    to: sink,
    targetFlow: env.send.maxFlow,
    useWrappedBalances: env.send.useWrappedBalances,
    fromTokens: seed?.fromTokens?.length ? seed.fromTokens : undefined,
    toTokens: seed?.toTokens?.length ? seed.toTokens : undefined,
    excludeFromTokens: undefined,
    excludeToTokens: undefined,
    maxTransfers: randInt(25, 250),
  });

  getPath(env.urls.pathfinderUrlV2, env.urls.pathfinderGetPathPath, payload, {
    component: 'pathfinder_send',
    journey: 'send_pathfinder',
  });
}
