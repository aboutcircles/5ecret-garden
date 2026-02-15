# Circles App Lists — Complete Implementation Guide

> Status: complete standalone guide colocated with shared list implementation.
> Scope: all list architecture, APIs, UX contract, policies, anti-patterns, QA checks, and maintenance rules.

---

## 1) Purpose

This is the single source of truth for list systems in the app.

You should be able to:

- implement a new list,
- migrate/refactor an old list,
- review list PRs,
- and debug list behavior

using this file only.

---

## 2) Shared architecture (canonical)

List implementation is layered:

1. `ListShell.svelte` — search toolbar + state gating + optional list container
2. `GenericList.svelte` — generic paged row renderer
3. State helpers:
   - `createPaginatedList(...)`
   - `createSearchablePaginatedList(...)`
4. Interaction helpers:
   - `createKeyboardListNavigator(...)`
   - `createListInputArrowDownHandler(...)`
   - `createSearchOverlayController(...)`
   - `registerOutsidePointerClose(...)`
5. Policy constants:
   - `searchPolicies.ts`

Primary goal: feature screens compose these, and avoid local adapter/boilerplate glue.

---

## 3) Shared UI/API reference

## 3.1 `ListToolbar.svelte`

Path: `src/lib/shared/ui/lists/ListToolbar.svelte`

Props:

- `query: Writable<string>` (required)
- `placeholder?: string`
- `class?: string`
- `actions?: Snippet`
- `onInputKeydown?: (KeyboardEvent) => void`
- `onInputFocus?: (FocusEvent) => void`
- `inputDataAttribute?: string` (auto-applied as `...="true"`)
- `inputEl?: HTMLInputElement | null` (`$bindable`)

## 3.2 `ListStates.svelte`

Path: `src/lib/shared/ui/lists/ListStates.svelte`

Props:

- `loading?: boolean`
- `error?: string | null`
- `isEmpty?: boolean`
- `isNoMatches?: boolean`
- `loadingLabel?: string`
- `emptyLabel?: string`
- `noMatchesLabel?: string`

## 3.3 `ListShell.svelte`

Path: `src/lib/shared/ui/lists/ListShell.svelte`

Core props:

- Search:
  - `query: Writable<string>`
  - `searchPlaceholder?: string`
  - `onInputKeydown?: (KeyboardEvent) => void`
  - `onInputFocus?: (FocusEvent) => void`
  - `inputDataAttribute?: string`
  - `inputEl?: HTMLInputElement | null`
  - `toolbarClass?: string`
  - `toolbarActions?: Snippet`
- States:
  - `loading?: boolean`
  - `error?: string | null`
  - `isEmpty?: boolean`
  - `isNoMatches?: boolean`
  - labels (`loadingLabel`, `emptyLabel`, `noMatchesLabel`)
- Layout:
  - `wrapInListContainer?: boolean` (default `true`)
  - `listRole?: string` (default `list`)
  - `listClass?: string`

## 3.4 `GenericList.svelte`

Path: `src/lib/shared/ui/lists/GenericList.svelte`

Store contract:

```ts
Readable<{
  data: T[];
  next: () => Promise<boolean>;
  ended: boolean;
}>
```

Props:

- `store` (required)
- `row` (required)
- `getKey?: (item) => string`
- `rowHeight?: number` (default `64`)
- `maxPlaceholderPages?: number` (default `2`)
- `expectedPageSize?: number`

Behavior: intersection-observer paging, placeholder staging, retry UI.

## 3.5 `SearchablePaginatedList.svelte`

Path: `src/lib/shared/ui/lists/SearchablePaginatedList.svelte`

Props:

- `items: Readable<T[]>` (required)
- `row: Component<{ item: T }>` (required)
- `addressOf: (item: T) => string` (required)
- `getKey?: (item: T) => string`
- `onInputKeydown?: (KeyboardEvent) => void`
- `inputDataAttribute?: string`
- `loading?: boolean`
- `error?: string | null`
- `rowHeight?: number`
- `pageSize?: number`
- `emptyLabel?: string`
- `noMatchesLabel?: string`
- `searchPlaceholder?: string`

Internally composes:

- `createSearchablePaginatedList(...)`
- `ListShell`
- `GenericList`

---

## 4) Shared state + utility reference

## 4.1 `createPaginatedList`

Path: `src/lib/shared/state/paginatedList.ts`

- Input: `Readable<T[]>`
- Output: `{ data, next, ended }`

## 4.2 `createSearchablePaginatedList`

Path: `src/lib/shared/state/searchablePaginatedList.ts`

Returns:

- `searchQuery`
- `profileNames`
- `filteredItems`
- `paginatedItems`

## 4.3 `createKeyboardListNavigator`

Path: `src/lib/shared/ui/lists/utils/keyboardListNavigator.ts`

Returns:

- `focusFirstRow`
- `onInputArrowDown`
- `onRowKeydown`
- `onRowClick`

## 4.4 `createListInputArrowDownHandler`

Path: `src/lib/shared/ui/lists/utils/listInputArrowDown.ts`

Canonical helper for input-level ArrowDown handoff:

- receives `{ getScope, rowSelector }`
- finds first row in scoped container (with document fallback)
- focuses first row on ArrowDown.

## 4.5 Overlay helpers

- `createSearchOverlayController` (`src/lib/shared/ui/lists/utils/searchOverlayController.ts`)
- `registerOutsidePointerClose` (`src/lib/shared/ui/lists/utils/outsidePointerClose.ts`)

## 4.6 Search policy constants

Path: `src/lib/shared/ui/lists/utils/searchPolicies.ts`

- `REMOTE_DEBOUNCE_MS = 250`
- `MIN_REMOTE_QUERY_LENGTH = 2`
- `DEFAULT_REMOTE_LIMIT = 50`
- `DEFAULT_BOOTSTRAP_LIMIT = 25`
- `DEFAULT_BOOTSTRAP_QUERY = 'Circles'`

Rule: avoid screen-local hardcoded policy constants unless documented.

---

## 5) Mandatory interaction contract

1. Input `ArrowDown` focuses first row.
2. Row `ArrowDown`/`ArrowUp` moves row focus.
3. `ArrowUp` on first row returns focus to input.
4. `Enter`/`Space` on focused row triggers primary action.
5. Nested interactive controls keep native key handling.
6. Row click focuses row (keyboard/mouse parity).
7. Row queries are list-scope-first.

## 5.1 Mandatory async search request contract

For any request/response based search (RPC, HTTP, SDK):

1. **Debounce user-triggered remote search** using shared policy (`SEARCH_POLICY.REMOTE_DEBOUNCE_MS`) unless a documented exception exists.
2. **Latest-query-wins is required**:
   - stale responses must never overwrite newer results.
   - implement via sequence/token check or shared controller helper.
3. **Best-effort cancellation is required**:
   - cancel scheduled-but-not-started work (`clearTimeout`, equivalent).
   - if transport abort is unavailable, ignore stale in-flight responses when they resolve.
4. **Clear lifecycle behavior**:
   - closing/disposing a search surface must invalidate pending/in-flight responses.
5. **No copy-paste local variants**:
   - prefer shared utilities (`createSearchOverlayController`) or equivalent reusable helper.

---

## 6) Accessibility requirements

- Focusable row wrapper where row is interactive.
- Correct role semantics (`role="button"` etc. for custom wrappers).
- Visible focus styles.
- No keyboard traps.
- Use ARIA state/labels where useful (`aria-pressed`, specific `aria-label`).

---

## 7) Canonical list modes

### Mode A — `ListShell + GenericList`

Use when you already have `{ data, next, ended }` or need custom filter wiring.

### Mode B — `SearchablePaginatedList`

Use when rows have address identity and need name+address search quickly.

### Mode C — Overlay search + picked list

Use for search-and-add picker flows.

### Mode D — Auth-gated list

Use where list rendering depends on auth/wallet/avatar state.

### Mode E — Specialized exception mode

Use only when domain UX requires non-shell behavior (example: day-events histogram popup).

---

## 8) Canonical implementation snippets

## 8.1 `ListShell + GenericList`

```svelte
<script lang="ts">
  import { writable } from 'svelte/store';
  import ListShell from '$lib/shared/ui/lists/ListShell.svelte';
  import GenericList from '$lib/shared/ui/lists/GenericList.svelte';
  import { createListInputArrowDownHandler } from '$lib/shared/ui/lists/utils/listInputArrowDown';

  const query = writable('');
  let listScopeEl: HTMLDivElement | null = null;

  const onSearchInputKeydown = createListInputArrowDownHandler({
    getScope: () => listScopeEl,
    rowSelector: '[data-my-row]'
  });
</script>

<div data-my-list-scope bind:this={listScopeEl}>
  <ListShell
    query={query}
    inputDataAttribute="data-my-search-input"
    onInputKeydown={onSearchInputKeydown}
    wrapInListContainer={false}
  >
    <GenericList store={myStore} row={MyRow} />
  </ListShell>
</div>
```

## 8.2 `SearchablePaginatedList`

```svelte
<SearchablePaginatedList
  items={rows}
  row={MyRow}
  addressOf={(row) => String(row.address)}
  onInputKeydown={onInputArrowDown}
  inputDataAttribute="data-my-search-input"
/>
```

---

## 9) Anti-patterns (forbidden)

1. Manual input data-attribute effects in list pages:

```ts
searchInputEl.setAttribute('data-...-search-input', 'true')
```

2. Repeated local ArrowDown handoff boilerplate.

Use shared helper instead.

3. Global document row queries when scoped query is possible.

4. Row handlers that swallow nested interactive key behavior.

---

## 10) Current list surfaces catalog

Representative surfaces and files:

- Contacts: `src/routes/contacts/+page.svelte`
- Balances: `src/lib/areas/wallet/ui/pages/Balances.svelte`
- Select asset: `src/lib/areas/wallet/ui/pages/SelectAsset.svelte`
- Transaction history: `src/routes/dashboard/TransactionHistoryPanel.svelte`
- Groups (all): `src/routes/groups/+page.svelte`
- Sales orders: `src/routes/sales/orders/+page.svelte`
- Market auth list: `src/lib/areas/settings/ui/sections/MarketAuthListSection.svelte`
- Payment gateways: `src/lib/areas/settings/ui/sections/PaymentSection.svelte`
- Gateway trusted accounts: `src/lib/areas/settings/ui/components/GatewayTrustedAccountsList.svelte`
- Profile relations: `src/lib/domains/profile/ui/components/SearchablePaginatedAddressList.svelte`
- Profile holders/holdings: `src/lib/domains/profile/ui/components/HoldersList.svelte`
- Avatar search (main): `src/lib/areas/contacts/ui/pages/SearchAvatar.svelte`
- Avatar search (dev): `src/routes/avatar-search/dev/AvatarSearchList.svelte`
- Group members management list surface:
  - `src/lib/areas/groups/ui/components/GroupMembersManager.svelte`
- Event day popup (exception):
  - `src/lib/domains/events/ui/history/EventHistoryDayEventsPopup.svelte`
- Kitchen sink list demos:
  - `src/routes/kitchen-sink/lists/+page.svelte`
  - `src/routes/kitchen-sink/list-search-role-model/+page.svelte`

---

## 11) Scope marker conventions

Use per-list wrappers like:

- `data-contacts-list-scope`
- `data-balances-list-scope`
- `data-select-asset-list-scope`
- `data-transactions-list-scope`
- `data-groups-list-scope`
- `data-market-orders-list-scope`
- `data-sales-orders-list-scope`
- `data-gateway-trust-list-scope`
- `data-payment-gateway-list-scope`
- `data-profile-relations-list-scope`
- `data-profile-holders-list-scope`
- `data-avatar-search-list-scope`
- `data-demo-list-scope`

Rule: scope-first queries; document fallback only as backup.

---

## 12) QA checklist

- [ ] Input ArrowDown focuses first row.
- [ ] First row ArrowUp returns to input.
- [ ] Enter/Space row activation works.
- [ ] Nested controls keep native interaction.
- [ ] Clicking row focuses row.
- [ ] Explicit loading/error/empty/no-match states.
- [ ] Shared search policy constants used.
- [ ] Overlay outside-close uses shared helper.
- [ ] No manual `setAttribute('data-...-search-input')` pattern.
- [ ] No duplicated local ArrowDown handoff boilerplate.

---

## 13) Known intentional exceptions

- `EventHistoryDayEventsPopup.svelte` has a custom shell due to histogram/grouped-event UX.
- Demo/dev routes may intentionally be broader than product constraints.

---

## 14) Maintenance protocol

When list primitives/surfaces/policies change:

1. Update this file in the same PR.
2. Keep new examples aligned with canonical patterns.
3. Re-run anti-pattern checks (search/lint/CI).

Completeness definition:

- New/migrated list work can be done from this file alone.
- No normative dependency on additional list docs.

