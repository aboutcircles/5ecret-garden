# Unified Avatar Search List -- Development Plan

## Goal

Create one unified avatar search list component for the app, starting simple and iterating. First rollout is isolated in `/avatar-search` with development assets in `/avatar-search/dev`.

Core behavior target:

- Search across **all avatars**.
- Prioritize avatars "close" to current user (contacts + bookmarked profiles).
- Local results update on every keypress.
- Remote lookup is debounced by **100 ms**.

---

## Existing Patterns to Reuse

### List containers

- `src/lib/components/GenericList.svelte`
  - Infinite/next-page style list rendering.
  - Consistent row placeholder/loading/error treatment.
- `src/lib/stores/paginatedList.ts`
  - Turns arrays into paginated `GenericList`-compatible stores.

### List row patterns

- `src/routes/contacts/ContactGroupRow.svelte`
  - Uses `RowFrame` + horizontal `Avatar` + chevron + profile popup behavior.
- `src/lib/components/TrustRelationRow.svelte`
  - Reusable minimal address/avatar row shape.

### Search UX patterns

- `src/lib/components/AddressInput.svelte`
  - Existing debounced search input pattern (currently 300ms).
- `src/lib/pages/SearchAvatar.svelte`
  - RPC `circles_searchProfiles` search and result mapping.
  - Supports `searchType` / `avatarTypes` constraints.
- `src/lib/utils/searchableProfiles.ts`
  - Local filtering by address + resolved profile names.

### Data sources for "close" list

- Contacts store: `src/lib/stores/contacts.ts` (+ query store)
  - Current avatar-local trust graph list.
- Bookmarks store: `src/lib/bookmarks/profileBookmarks.ts`
  - Device-local bookmarked profile addresses.

### Style system references

- `PageScaffold` layout: `src/lib/components/layout/PageScaffold.svelte`
- Existing contacts route style: `src/routes/contacts/+page.svelte`

---

## Proposed Initial Architecture (V1)

## 1) New feature-local module layout (inside route dev area)

Create and iterate in:

- `src/routes/avatar-search/dev/` (workspace)
- planned feature files (initial proposal):
  - `AvatarSearchList.svelte` (container component)
  - `AvatarSearchRow.svelte` (row rendering)
  - `avatarSearch.types.ts`
  - `avatarSearch.sources.ts` (local + remote data assembly)
  - `avatarSearch.rank.ts` (priority/ranking)
  - `avatarSearch.state.ts` (query/debounce/state wiring)

> During maturation, reusable parts can be promoted to `$lib/components` / `$lib/...`.

## 2) Unified result model

Use a normalized item shape:

- `address`
- `profile` (name/image/type if available)
- `source`: `local-contact | local-bookmark | remote`
- `priorityBucket`: `close | global`
- `matchMeta`: matched by `address | name | both`

## 3) Search pipeline

1. On each keypress:
   - Recompute local candidates (contacts + bookmarks) immediately.
   - Filter locally by query.
2. In parallel:
   - Trigger remote profile search with **100ms debounce**.
   - Start remote search only when query length is **>= 2**.
3. Merge:
   - Deduplicate by lowercased address.
   - Keep best representation for duplicates (prefer local-enriched data when available).
4. Rank/order:
   - `close` matches first (contacts/bookmarks), then remote/global.
   - Inside `close`:
     - contact + bookmarked (both) > contact only > bookmarked only > trusted-by only.
     - "I trust" ranks above "trusts me".
   - Inside each rank tier: exact address > name-prefix > substring > lexical fallback.

---

## Implementation Phases

## Phase 1 -- Route + scaffolding (done)

- Added `src/routes/avatar-search/+page.svelte`.
- Added `src/routes/avatar-search/dev/+page.svelte`.
- Linked top route to dev sub-route.

## Phase 2 -- Minimal functional list

- Add route-local `AvatarSearchList.svelte` with:
  - input,
  - merged local+remote data,
  - dedupe,
  - basic prioritization (`close` first).
- Include lazy-loading infinite scroll behavior from the start (`GenericList` + paginated store wiring).
- Reuse row styling from `RowFrame` + `Avatar` conventions.

### Phase 2 implementation status

- `AvatarSearchList.svelte` implemented in `src/routes/avatar-search/dev/`
- `AvatarSearchRow.svelte` implemented with `RowFrame` + horizontal `Avatar` + profile popup opening
- Ranking helpers implemented in `avatarSearch.rank.ts`
- Unified item type added in `avatarSearch.types.ts`
- Remote query debounced to 100ms and gated behind minimum query length 2
- Merged/deduplicated local + remote list rendered with `GenericList` + `createPaginatedList` (infinite scroll behavior)

## Phase 3 -- Debounced remote + immediate local refresh

- Introduce explicit split execution:
  - local filter synchronous per keypress,
  - remote call debounced 100ms.
- Add cancellation/stale-result guard for race safety.

## Phase 4 -- Ranking refinement

- Improve scoring (exact address, startsWith, name match tiers, trust relation hints).
- Keep deterministic and stable sorting.

## Phase 5 -- Harden + extract reusable core

- Add tests for ranking/dedupe helpers.
- Move stable generic parts into `$lib` for usage in flows currently using `SearchAvatar.svelte`.

---

## Confirmed decisions

1. Bookmarks and contacts have the same base weight, but **contact+bookmark together ranks higher**.
2. Remote search starts only from **2+ characters**.
3. V1 includes **lazy loading / infinite scroll** right away.
4. Both trust directions are included in close results, with **"I trust" ranked above "trusts me"**.
