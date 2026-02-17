# Problem Description: Current Implementation vs. Reported Gaps

This document captures the current implementation state in the Circles app and the open gaps reported by the team. Each item includes **what is already implemented** (based on the code) and **what is missing or broken**.

## Scope
- Wallet balances, wrap/unwrap, migration, send flow pathfinding.
- Popup UX (CTA visibility, navigation stack).
- Marketplace orders + product detail popups.
- Profile editor layout on mobile.

## Priority order (bang for buck & ease of implementation)
1) Unwrap max button ✅
2) Compact balance units (kCRC, MCRC) ✅
3) Profile editor mobile input widths ✅
4) Address displays as avatars (compact representation)
5) Orders not loading after auth ✅
6) Marketplace item click → detail popup ✅
7) Cart “Continue” needs multiple presses ✅
8) Popup stack scroll position retention
9) Flow dirty state across all steps
10) Send flow include/exclude pathfinder tokens
11) Wrapper token contracts shown in avatar context
12) Floating primary CTA in popups
13) V1 balance migration reliability

## 1) Wrap max / Unwrap max buttons ✅
**Reported gap**
- “Wrap max / Unwrap max” buttons should exist.

**Current implementation**
- `WrapTokens.svelte` includes a “Use max” button that fills the input with the full balance.
- `UnwrapTokens.svelte` has no “Use max” control.

**Gap**
- Unwrap flow does not provide a max-amount shortcut.

## 2) Balances: kCRC, MCRC etc. ✅
**Reported gap**
- Show balances in abbreviated units (kCRC, MCRC, etc.).

**Current implementation**
- Balances are rendered as raw CRC values in `BalanceRow.svelte` using `roundToDecimals`.

**Gap**
- No unit compaction formatting is applied to CRC balances in the list.

## 3) Profile editor input widths overflow on mobile ✅
**Reported gap**
- Profile editor inputs are too long for mobile layout (extend beyond container).

**Current implementation**
- Profile editor uses `ProfileHeaderEditor.svelte`, which renders inputs inside a flex row (`flex-1`), but does not include width constraints (e.g., `w-full`) on inputs.
- Inputs are using DaisyUI classes (`input input-sm input-bordered`) without mobile-specific width constraints.

**Gap**
- Mobile layout needs enforced width/overflow handling to keep input fields within container bounds.

## 4) Addresses should render as avatars (compact representation)
**Reported gap**
- “All addresses should be avatars (maybe compact representation).”

**Current implementation**
- Wallet balances use `Avatar` in `BalanceRow.svelte` with `view="horizontal"`.
- Many list rows already use Avatar in the UI (contacts, groups, orders, etc.).

**Gap**
- Some address-only displays still appear as raw text (exact locations TBD). A compact avatar-based address representation is not enforced globally.

**Implementation checklist**
- [ ] Audit UI surfaces that render raw addresses (transaction rows, list rows, settings, popups) and catalog each location.
- [ ] Introduce or reuse a shared compact address avatar component (e.g., `Avatar` with horizontal/compact layout + fallback short address).
- [ ] Replace raw address text in identified views with the avatar component, preserving alignment and list density.
- [ ] Ensure the avatar handles missing profile metadata and renders deterministic fallbacks (initials/short address).
- [ ] Verify address tooltips/copy affordances remain accessible after replacing text.

## 5) Orders not loading after successful authentication ✅
**Reported gap**
- Orders don’t load even after authentication succeeds.

**Current implementation**
- Settings Orders/Sales tabs use `ordersAuthed` / `salesAuthed` state and `MarketAuthListSection`.
- Auth uses `signInWithSafe` and `getMarketClient().auth.getAuthMeta()`.
- Orders data is loaded via `ordersStores.ts` and SSE subscription.

**Gap**
- Orders list may not refresh after auth; likely requires store refresh or re-instantiation once auth changes.

## 6) Marketplace item click doesn’t open detail popup ✅
**Reported gap**
- Clicking on an item in marketplace doesn’t open the detail view popup.

**Current implementation**
- Product detail popup exists (`ProductDetailsPopup.svelte`) and is wired in `kitchen-sink` gallery.
- Product routes exist at `/market/[seller]/[sku]`, but popup opening from list may be broken.

**Gap**
- Marketplace list items likely do not dispatch the correct open popup action, or click handling is broken.

## 7) Cart “Continue” button requires multiple presses ✅
**Reported gap**
- “Continue” in cart must be pressed multiple times (validation/focus issue?).

**Current implementation**
- Checkout flow uses per-step validation and `openStep` navigation (see docs in `docs/multi-step-flows-send-gold-standard-blueprint.md`).
- Cart panel uses shared flow patterns, but no explicit multi-press logic is implemented in the code search.

**Gap**
- A suspected UX/validation bug exists in the cart flow; needs reproduction and trace.

## 8) Popup stack scroll position not retained
**Reported gap**
- Scroll position resets when navigating back in popup stack.

**Current implementation**
- Popup pages are kept mounted, but only the active page is visible.
- The scroll container is the outer `.popup` (single container) rather than per-page.

**Gap**
- Scroll position is global to the popup shell. There is no per-page scroll state retention when switching steps.

## 9) Dirty state tracking across the whole flow
**Reported gap**
- Track dirty state for the whole flow, not just a page.

**Current implementation**
- Popup dirty tracking lives in `PopupHost.svelte` and marks the **current page** dirty on input/change events.
- Dirty state triggers close-confirm handling when dismiss policy is `explicit`.

**Gap**
- Dirty state is page-scoped, not flow-scoped. When navigating between steps, dirty state does not persist across the flow stack.

## 10) Send flow: pathfinder include/exclude token options
**Reported gap**
- Add pathfinder include/exclude token options in send flow (always use path transfer).

**Current implementation**
- Send flow (`3_Amount.svelte`) uses pathfinding for the auto-route token (transitive transfer).
- Excluded tokens are obtained via `sdk.getDefaultTokenExcludeList(...)` and passed to the pathfinder.
- There is an “Advanced routing” panel for max transfers only; no UI to include/exclude tokens.

**Gap**
- No UI to override include/exclude tokens.
- Auto-route uses defaults only; cannot force a specific include/exclude list.

## 11) Show wrapper token contracts in avatar (group mint handlers / treasuries)
**Reported gap**
- Wrapper token contracts should show in avatar context. Avatars should show group mint handlers/treasuries, etc.

**Current implementation**
- `BalanceRow.svelte` uses `Avatar` with `address={item.tokenOwner}` for the balance owner.
- Group settings page fetches mint handler/service/redemption handler addresses, but does not render them in avatar contexts.

**Gap**
- Wrapper token contract addresses are not shown as avatar identities in balances or related flows.
- Group contract roles are not surfaced as avatar identities in UI.

## 12) Popup primary CTA visibility (floating button)
**Reported gap**
- If the primary CTA (“Next”, “Continue”, “Save”, etc.) is off-screen in a popup, it should become a floating, always-visible button. When scrolled to the bottom, it should snap back into its original position.

**Current implementation**
- Popups are rendered via `PopupHost.svelte`, which uses a single scroll container (`.popup`) with `overflow-y: auto`.
- Primary CTA placement is handled by local page markup (e.g., in-step buttons or `PopupActionBar`), which is static and does not float.
- There is no shared floating CTA or scroll snapping behavior for popups.

**Gap**
- No floating CTA pattern exists for popup pages; CTA visibility depends on the page’s layout and scroll position.

## 13) Migrating v1 balance doesn’t work?
**Reported gap**
- V1 balance migration seems to fail.

**Current implementation**
- Balance row action “Migrate Tokens to V2” is available for `CrcV1_Signup` tokens when an avatar v2 is connected (`BalanceRow.svelte`).
- The UI opens `MigrateTokens.svelte` in a popup.

**Gap**
- Functional gap: migration execution is suspected to fail at runtime. Needs verification of on-chain path and error reporting.

---

## Related files
- `src/lib/shared/ui/shell/PopupHost.svelte`
- `src/lib/shared/ui/shell/PopupActionBar.svelte`
- `src/lib/areas/wallet/ui/components/BalanceRow.svelte`
- `src/lib/areas/wallet/ui/pages/WrapTokens.svelte`
- `src/lib/areas/wallet/ui/pages/UnwrapTokens.svelte`
- `src/lib/areas/wallet/flows/send/3_Amount.svelte`
- `src/lib/shared/ui/profile/ProfileHeaderEditor.svelte`
- `src/lib/areas/market/orders/*`
- `src/routes/market/*`
