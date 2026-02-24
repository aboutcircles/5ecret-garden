import { PRESETS } from './presets.js';

function asBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const v = String(value).toLowerCase().trim();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function asNum(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asCsv(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeWeights(weights) {
  const total = Object.values(weights).reduce((acc, v) => acc + (Number(v) || 0), 0);
  if (total <= 0) {
    throw new Error('At least one journey weight must be > 0.');
  }
  return {
    scroll: (weights.scroll || 0) / total,
    profileBrowse: (weights.profileBrowse || 0) / total,
    sendPathfinder: (weights.sendPathfinder || 0) / total,
    profileUpdate: (weights.profileUpdate || 0) / total,
  };
}

export function loadEnv() {
  const presetName = String(__ENV.PRESET || 'full');
  const preset = PRESETS[presetName] || PRESETS.full;

  const toggles = {
    enableScroll: asBool(__ENV.ENABLE_SCROLL, preset.toggles.enableScroll),
    enableProfileBrowse: asBool(__ENV.ENABLE_PROFILE_BROWSE, preset.toggles.enableProfileBrowse),
    enableSendPathfinder: asBool(__ENV.ENABLE_SEND_PATHFINDER, preset.toggles.enableSendPathfinder),
    enableProfileUpdate: asBool(__ENV.ENABLE_PROFILE_UPDATE, preset.toggles.enableProfileUpdate),
    enableMarketBackground: asBool(__ENV.ENABLE_MARKET_BG, preset.toggles.enableMarketBackground),
    enableSeed: asBool(__ENV.ENABLE_SEED, preset.toggles.enableSeed),
  };

  const weights = normalizeWeights({
    scroll: asNum(__ENV.W_SCROLL, preset.weights.scroll),
    profileBrowse: asNum(__ENV.W_PROFILE, preset.weights.profileBrowse),
    sendPathfinder: asNum(__ENV.W_SEND, preset.weights.sendPathfinder),
    profileUpdate: asNum(__ENV.W_UPDATE, preset.weights.profileUpdate),
  });

  return {
    presetName,
    toggles,
    weights,
    urls: {
      circlesRpcUrl: __ENV.CIRCLES_RPC_URL || 'https://staging.circlesubi.network/',
      pathfinderUrlV2: __ENV.PATHFINDER_URL_V2 || __ENV.PATHFINDER_URL || 'https://pathfinder.aboutcircles.com',
      pathfinderGetPathPath: __ENV.PATHFINDER_GET_PATH_PATH || '/v2/pathfinder/getPath',
      profileServiceUrl: __ENV.PROFILE_SERVICE_URL || 'https://rpc.aboutcircles.com/profiles/',
      pinApiBase: __ENV.PIN_API_BASE || __ENV.MARKET_API_BASE || 'https://market-api.aboutcircles.com:18080/market',
      marketApiBase: __ENV.MARKET_API_BASE || 'https://market-api.aboutcircles.com:18080/market',
      marketOperator: __ENV.MARKET_OPERATOR || '0x20ced4ed3b1651b832a77e13e54ea5cb14c8b95b',
      marketChainId: asNum(__ENV.MARKET_CHAIN_ID, 100),
    },
    pacing: {
      minThinkMs: asNum(__ENV.MIN_THINK_MS, 100),
      maxThinkMs: asNum(__ENV.MAX_THINK_MS, 1200),
      marketBackgroundChance: asNum(__ENV.MARKET_BACKGROUND_CHANCE, 0.2),
    },
    seed: {
      query: __ENV.SEED_QUERY || 'a',
      pageSize: asNum(__ENV.SEED_PAGE_SIZE, 50),
      pages: asNum(__ENV.SEED_PAGES, 4),
      maxAvatars: asNum(__ENV.SEED_MAX_AVATARS, 250),
      actors: asCsv(__ENV.SEED_ACTORS),
      profileCids: asCsv(__ENV.SEED_PROFILE_CIDS),
      fromTokens: asCsv(__ENV.SEED_FROM_TOKENS),
      toTokens: asCsv(__ENV.SEED_TO_TOKENS),
    },
    scroll: {
      mode: __ENV.SCROLL_MODE || 'mixed',
      routineMin: asNum(__ENV.SCROLL_PAGES_ROUTINE_MIN, 2),
      routineMax: asNum(__ENV.SCROLL_PAGES_ROUTINE_MAX, 4),
      mediumMin: asNum(__ENV.SCROLL_PAGES_MEDIUM_MIN, 5),
      mediumMax: asNum(__ENV.SCROLL_PAGES_MEDIUM_MAX, 12),
      deepMin: asNum(__ENV.SCROLL_PAGES_DEEP_MIN, 20),
      deepMax: asNum(__ENV.SCROLL_PAGES_DEEP_MAX, 80),
      pageSize: asNum(__ENV.SCROLL_PAGE_SIZE, 30),
      enrichPerPage: asNum(__ENV.SCROLL_ENRICH_PER_PAGE, 3),
    },
    send: {
      maxFlow: __ENV.SEND_MAX_FLOW || '99999999999999999999999999999999999',
      useWrappedBalances: asBool(__ENV.SEND_USE_WRAPPED_BALANCES, true),
    },
    stages: {
      warmupRate: asNum(__ENV.WARMUP_RATE, 5),
      stepRateDelta: asNum(__ENV.STEP_RATE_DELTA, 5),
      steps: asNum(__ENV.RAMP_STEPS, 8),
      stepMinutes: asNum(__ENV.RAMP_STEP_MINUTES, 10),
      warmupMinutes: asNum(__ENV.WARMUP_MINUTES, 10),
      preAllocatedVUs: asNum(__ENV.PRE_ALLOCATED_VUS, 20),
      maxVUs: asNum(__ENV.MAX_VUS, 800),
      timeUnit: __ENV.RATE_TIME_UNIT || '1s',
    },
    tls: {
      insecureSkipVerify: asBool(__ENV.INSECURE_SKIP_TLS_VERIFY, false),
    },
  };
}
