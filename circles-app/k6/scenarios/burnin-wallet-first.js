import { loadEnv } from '../config/env.js';
import { buildBurnInStages } from '../config/stages.js';
import { buildThresholds } from '../config/thresholds.js';
import { think } from '../utils/checks.js';
import { chance, weightedPick } from '../utils/random.js';
import { runMarketBackgroundJourney } from '../journeys/marketBackground.js';
import { runProfileBrowseJourney } from '../journeys/profileBrowse.js';
import { runProfileUpdateJourney } from '../journeys/profileUpdate.js';
import { runScrollJourney } from '../journeys/scroll.js';
import { runSendPathfinderJourney } from '../journeys/sendPathfinder.js';
import { buildSeedData } from '../seed/seedData.js';

const env = loadEnv();

export const options = {
  insecureSkipTLSVerify: env.tls.insecureSkipVerify,
  scenarios: {
    burnin_wallet_first: {
      executor: 'ramping-arrival-rate',
      startRate: env.stages.warmupRate,
      timeUnit: env.stages.timeUnit,
      preAllocatedVUs: env.stages.preAllocatedVUs,
      maxVUs: env.stages.maxVUs,
      stages: buildBurnInStages(env.stages),
    },
  },
  thresholds: buildThresholds(),
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

function fallbackSeed() {
  return {
    avatars: env.seed.actors || [],
    actors: env.seed.actors || [],
    sellers: [],
    profileCids: env.seed.profileCids || [],
    fromTokens: env.seed.fromTokens || [],
    toTokens: env.seed.toTokens || [],
  };
}

export function setup() {
  if (!env.toggles.enableSeed) return fallbackSeed();
  try {
    return buildSeedData(env);
  } catch {
    return fallbackSeed();
  }
}

function runPrimaryJourney(seed) {
  const selected = weightedPick([
    {
      key: 'scroll',
      weight: env.weights.scroll,
      enabled: env.toggles.enableScroll,
    },
    {
      key: 'profileBrowse',
      weight: env.weights.profileBrowse,
      enabled: env.toggles.enableProfileBrowse,
    },
    {
      key: 'sendPathfinder',
      weight: env.weights.sendPathfinder,
      enabled: env.toggles.enableSendPathfinder,
    },
    {
      key: 'profileUpdate',
      weight: env.weights.profileUpdate,
      enabled: env.toggles.enableProfileUpdate,
    },
  ]);

  switch (selected) {
    case 'scroll':
      runScrollJourney(env, seed);
      return;
    case 'profileBrowse':
      runProfileBrowseJourney(env, seed);
      return;
    case 'sendPathfinder':
      runSendPathfinderJourney(env, seed);
      return;
    case 'profileUpdate':
      runProfileUpdateJourney(env, seed);
      return;
    default:
      runProfileBrowseJourney(env, seed);
  }
}

export default function (setupData) {
  const seed = setupData || fallbackSeed();
  runPrimaryJourney(seed);

  if (env.toggles.enableMarketBackground && chance(env.pacing.marketBackgroundChance)) {
    runMarketBackgroundJourney(env, seed);
  }

  think(env.pacing.minThinkMs, env.pacing.maxThinkMs);
}
