# Secret Garden k6 Load Testing

This directory contains the **wallet-first burn-in** load test scaffold for Secret Garden.

It is designed to:
- simulate realistic SG power-user behavior,
- ramp traffic until the first constrained component fails,
- support modular enable/disable of journeys,
- seed test data directly from the same APIs being tested.

---

## 1) What this test hits

By default, the test can target these surfaces:

- **Circles RPC** (`CIRCLES_RPC_URL`)
  - `circles_searchProfiles`
  - `circles_getProfileByCidBatch`
  - `circles_getCommonTrust`
- **Pathfinder** (`PATHFINDER_URL_V2` + `PATHFINDER_GET_PATH_PATH`)
- **Profiles service** (`PROFILE_SERVICE_URL/{cid}`)
- **Pin API** (`PIN_API_BASE/api/pin`, optionally `/api/pin-media`)
- **Market background** (`MARKET_API_BASE`)
  - `/api/sellers`
  - `/api/operator/{operator}/catalog`

---

## 2) Test layout

```text
k6/
  clients/      # reusable HTTP/RPC client modules
  config/       # env, presets, thresholds, stage builder
  journeys/     # workload journeys
  scenarios/    # entrypoint scenario(s)
  seed/         # seed/discovery data loading
  utils/        # random, checks, tags, data helpers
```

Main scenario:
- `k6/scenarios/burnin-wallet-first.js`

---

## 3) Quick start (copy/paste)

From repository root:

```bash
cd /home/daniel/src/aboutcircles/5ecret-garden/circles-app
```

Run default burn-in:

```bash
npm run k6:burnin
```

Run wallet-only with seed discovery:

```bash
PRESET=wallet-only ENABLE_SEED=1 SEED_QUERY=a SEED_PAGES=6 SEED_PAGE_SIZE=50 SEED_MAX_AVATARS=300 npm run k6:burnin
```

Run with self-signed TLS (ignore cert validation):

```bash
INSECURE_SKIP_TLS_VERIFY=1 npm run k6:burnin
```

Run wallet-only + seed + self-signed TLS:

```bash
PRESET=wallet-only ENABLE_SEED=1 INSECURE_SKIP_TLS_VERIFY=1 SEED_QUERY=a SEED_PAGES=6 SEED_PAGE_SIZE=50 SEED_MAX_AVATARS=300 npm run k6:burnin
```

---

## 4) Presets (copy/paste)

Full mixed workload:

```bash
PRESET=full npm run k6:burnin
```

Wallet-focused (no market background):

```bash
PRESET=wallet-only npm run k6:burnin
```

Pathfinder isolation:

```bash
PRESET=pathfinder-only npm run k6:burnin
```

Scroll storm isolation:

```bash
PRESET=scroll-only npm run k6:burnin
```

---

## 5) Important env vars

### Core endpoints

```bash
CIRCLES_RPC_URL=https://staging.circlesubi.network/
PATHFINDER_URL_V2=https://pathfinder.aboutcircles.com
PATHFINDER_GET_PATH_PATH=/v2/pathfinder/getPath
PROFILE_SERVICE_URL=https://rpc.aboutcircles.com/profiles/
PIN_API_BASE=https://market-api.aboutcircles.com:18080/market
MARKET_API_BASE=https://market-api.aboutcircles.com:18080/market
MARKET_OPERATOR=0x20ced4ed3b1651b832a77e13e54ea5cb14c8b95b
MARKET_CHAIN_ID=100
```

### TLS

```bash
INSECURE_SKIP_TLS_VERIFY=1
```

### Journey toggles

```bash
ENABLE_SCROLL=1
ENABLE_PROFILE_BROWSE=1
ENABLE_SEND_PATHFINDER=1
ENABLE_PROFILE_UPDATE=1
ENABLE_MARKET_BG=1
ENABLE_SEED=1
```

### Journey weights

```bash
W_SCROLL=40
W_PROFILE=25
W_SEND=25
W_UPDATE=10
```

### Scroll behavior

```bash
SCROLL_MODE=mixed
SCROLL_PAGES_ROUTINE_MIN=2
SCROLL_PAGES_ROUTINE_MAX=4
SCROLL_PAGES_MEDIUM_MIN=5
SCROLL_PAGES_MEDIUM_MAX=12
SCROLL_PAGES_DEEP_MIN=20
SCROLL_PAGES_DEEP_MAX=80
SCROLL_PAGE_SIZE=30
SCROLL_ENRICH_PER_PAGE=3
```

### Seed data discovery

```bash
SEED_QUERY=a
SEED_PAGES=4
SEED_PAGE_SIZE=50
SEED_MAX_AVATARS=250
SEED_ACTORS=0x...,0x...
SEED_PROFILE_CIDS=Qm...,Qm...
SEED_FROM_TOKENS=0x...,0x...
SEED_TO_TOKENS=0x...,0x...
```

### Burn-in ramp

```bash
WARMUP_RATE=5
WARMUP_MINUTES=10
STEP_RATE_DELTA=5
RAMP_STEPS=8
RAMP_STEP_MINUTES=10
PRE_ALLOCATED_VUS=20
MAX_VUS=800
RATE_TIME_UNIT=1s
```

---

## 6) Common command recipes

Wallet-only smoke (short):

```bash
PRESET=wallet-only WARMUP_MINUTES=2 RAMP_STEPS=1 RAMP_STEP_MINUTES=2 ENABLE_SEED=1 INSECURE_SKIP_TLS_VERIFY=1 npm run k6:burnin
```

Pathfinder calibration run:

```bash
PRESET=pathfinder-only ENABLE_SEED=1 INSECURE_SKIP_TLS_VERIFY=1 WARMUP_RATE=2 STEP_RATE_DELTA=2 RAMP_STEPS=6 RAMP_STEP_MINUTES=5 npm run k6:burnin
```

Scroll stress run with deep behavior:

```bash
PRESET=scroll-only ENABLE_SEED=1 SCROLL_MODE=deep SCROLL_PAGES_DEEP_MIN=30 SCROLL_PAGES_DEEP_MAX=120 INSECURE_SKIP_TLS_VERIFY=1 npm run k6:burnin
```

Full burn-in with market background + TLS bypass:

```bash
PRESET=full ENABLE_SEED=1 INSECURE_SKIP_TLS_VERIFY=1 npm run k6:burnin
```

---

## 7) Thresholds and abort behavior

Thresholds are defined in `k6/config/thresholds.js`.

Key behavior:
- strict abort-on-fail on primary wallet components,
- market background monitored with relaxed threshold,
- global checks threshold enforced.

---

## 8) Notes

- If your market endpoint uses self-signed certs, keep `INSECURE_SKIP_TLS_VERIFY=1`.
- If a component gets zero traffic in a specific preset, that component's thresholds may show trivial values for that run.
- Seed happens in `setup()` so data discovery is performed once per test run and then reused by VUs.
