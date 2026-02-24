# Multi-Step Flow UX Blueprint

**Baseline:** Send flow (`src/lib/areas/wallet/flows/send`)  
**Goal:** Align all multi-step experiences to the Send flow quality bar (interaction, clarity, accessibility, consistency).

---

## 0) Navigation layers and allowed usage (normative)

This blueprint governs **three navigation layers** that must not be mixed arbitrarily:

1. **Flow runtime layer** (`openStep`, `replaceStep`)
   - Use for forward step transitions *within the same popup flow*.
   - Preferred default for all popup multi-step chains.

2. **Popup stack layer** (`popupControls.back`, `popupControls.popTo`, `popupControls.close`)
   - Use for stack-aware navigation (back, targeted edit loops, full flow close).
   - `popTo` + fallback `openStep` is the canonical review-edit pattern.

3. **Route/page layer** (`goto`, `history.back`)
   - Use only for full-page navigation and route-based experiences.
   - Must not be used as an in-popup step transition mechanism.

### Allowed / forbidden combinations

- ✅ Allowed: `openStep` inside a popup flow for next-step progression.
- ✅ Allowed: `popTo` + fallback `openStep` from review to earlier step.
- ✅ Allowed: route wrappers that open a popup immediately for deep-link support.
- ⚠️ Allowed but explicit: **close current flow, then open a new top-level flow** (see section 3.6).
- ❌ Forbidden: `history.back()` or route `goto()` to emulate popup step back.
- ❌ Forbidden: opening a different-domain step into the same stack without explicit reset contract.

### Deep-link popup wrapper contract (normative)

For route wrappers that open a popup immediately (e.g. order details deep links):

1. Wrapper opening must be **idempotent** (must not double-open on hydration/re-run).
2. Wrapper must define explicit close behavior:
   - stay on wrapper route, or
   - navigate back to parent list route, or
   - redirect elsewhere.
3. Focus return target must be deterministic (wrapper host anchor), not incidental browser focus state.

---

## 1) Scope and audited flow inventory

This blueprint is based on a full code audit of step-based experiences across wallet, groups, contacts, settings/gateway, market, and admin.

### Wallet
- `flows/send/1_To.svelte`
- `flows/send/2_Asset.svelte`
- `flows/send/3_Amount.svelte`
- `flows/send/4_Send.svelte`
- `flows/migrateToV2/1_GetInvited.svelte`
- `flows/migrateToV2/2_CreateProfile.svelte`
- `flows/migrateToV2/3_MigrateContacts.svelte`
- `flows/migrateToV2/4_Migrate.svelte`
- onboarding chains:
  - `ui/onboarding/SelectWallet.svelte`
  - `ui/onboarding/ConnectCircles.svelte`

### Contacts
- `flows/addContact/1_Search.svelte`
- `flows/addContact/2_YouAlreadyTrust.svelte`

### Groups
- `flows/createGroup/1_CreateGroup.svelte`
- `flows/createGroup/2_Settings.svelte`
- `flows/createGroup/3_Review.svelte`
- `flows/createGroup/4_Create.svelte`
- `flows/manageGroupMembers/1_manageGroupMembers.svelte`

### Settings / Gateway
- `flows/gateway/CreateGatewayProfile.svelte`
- `flows/gateway/ConfirmCreateGateway.svelte`
- `flows/gateway/ManageTrust.svelte`
- `flows/gateway/SearchTrustReceiver.svelte`
- `flows/gateway/ConfirmGatewayTrust.svelte`
- `flows/gateway/ConfirmGatewayUntrust.svelte`

### Market
- offer creation:
  - `flows/offer/1_Product.svelte`
  - `flows/offer/2_Pricing.svelte`
  - `flows/offer/3_PreviewPublish.svelte`
- checkout chain:
  - `flows/checkout/CartPanel.svelte`
  - `flows/checkout/CheckoutForms.svelte`
  - `flows/checkout/CheckoutReview.svelte`
  - `flows/checkout/CheckoutPayment.svelte`

### Admin
- new connection:
  - `flows/newConnection/1_Seller.svelte`
  - `flows/newConnection/2_Details.svelte`
- new product:
  - `flows/newProduct/1_Seller.svelte`
  - `flows/newProduct/2_Catalog.svelte`
  - `flows/newProduct/3_Type.svelte`
  - `flows/newProduct/4_CreateOdooConnection.svelte`
  - `flows/newProduct/5_Details.svelte`
  - `flows/newProduct/6_Summary.svelte`

### Additional step-like experiences (included for consistency)

These are not always under `areas/*/flows`, but they are part of the multi-step UX system and therefore in scope for standards:

- **Registration route steps** (PageScaffold meta such as “Step X of Y”):
  - `routes/register/register-person/+page.svelte`
  - `routes/register/register-profile/+page.svelte`
  - `routes/register/register-organization/+page.svelte`
  - `routes/register/register-v1-person/+page.svelte`
- **Deep-link route wrappers that immediately open popups**:
  - `routes/sales/orders/[orderId]/+page.svelte`
- **Group-management prototype step surfaces** (list → popup/action chains):
  - `routes/group-management/+page.svelte`
  - `routes/group-management/[group]/+page.svelte`
  - `routes/group-management/GroupSettingsPrototype.svelte`

If a team wants to apply this blueprint only to popup flows, that must be declared explicitly in project docs. Default scope here is broader: popup flows + step-like page flows + deep-link popup entry patterns.

---

## 2) Why Send is the current gold standard

The Send flow is currently the most complete implementation of:

1. **Step orientation clarity**
   - Uses `FlowStepHeader` with progress bars and labels.
   - Task-aligned step nouns (conceptually): Recipient → Route/Asset → Amount → Review.

2. **Navigation precision**
   - Uses shared flow runtime (`openStep`) and stack-aware navigation (`popTo`) to support direct edits from Review.
   - Includes stable fallback behavior if stack state does not match expectation.

3. **Focus and keyboard quality**
   - Explicit focus targets via `data-send-step-initial-focus` and `data-send-step-initial-input`.
   - Keyboard shortcuts for high-frequency actions (Enter continue, Backspace return behavior).

4. **Validation rigor**
   - Derived `canContinue` and explicit error states:
     - route not ready,
     - zero amount,
     - exceeds route/asset cap,
     - pathfinding failure.
   - Actionable remediation copy and actions.

5. **Progressive disclosure**
   - Advanced options are available but collapsed by default (“More options”).

6. **Reusable primitives**
   - Built on shared infrastructure (`PopupHost`, `focusPolicy`, list keyboard navigator, flow runtime/guards/contracts).

---

## 3) Keyboard and focus system (complete pattern map)

This section captures the current keyboard/focus contract implemented in shared infrastructure and Send-specific enhancements.

## 3.1 Popup shell-level behavior (`PopupHost.svelte`)

### Focus trap
- `Tab`: cycles focus within popup focusables.
- `Shift+Tab`: reverse-cycles focus within popup.
- Prevents escape of keyboard focus outside open dialog.

### Dialog close/back keys
- `Escape`: closes popup (`popupControls.close()`).
- `Backspace`:
  - if target is editable input/textarea/select/contenteditable/ARIA textbox: **ignored** (typing preserved),
  - if modified (`alt/ctrl/meta`): **ignored**,
  - if popup stack has previous entries: triggers `popupControls.back()`,
  - if it is the last popup page: does nothing (does not close final page).

### Focus restoration lifecycle
- On popup open: stores previously focused element.
- On popup close: restores focus to previously focused element.

### Initial focus policy
- Uses `shouldAutoFocusTextInput()` (`focusPolicy.ts`): desktop/fine-pointer/hover + min width.
- On page activation, prefers:
  1. on desktop-like: `[data-popup-initial-input], [data-send-step-initial-input]`, fallback to focus target.
  2. on touch/smaller contexts: `[data-popup-initial-focus], [data-send-step-initial-focus]`.
  3. final fallback: close/back control or popup title.

## 3.2 Shared list/search keyboard behavior

### Input-level handoff (`createListInputArrowDownHandler`)
- `ArrowDown` on list search input → first row in scope gets focus.
- `ArrowUp` on search input tries to focus active tab above via `focusActiveTabAbove`.

### Row-level navigation (`createKeyboardListNavigator`)
- `ArrowDown` / `ArrowUp`: move between rows.
- `ArrowUp` on first row: moves focus back to input.
- `ArrowLeft`: jumps to first row.
- `Escape` on row:
  - returns focus to input,
  - consumes event (prevents popup-level Escape close).
- `Enter` / `Space`:
  - activates row only if event target is the row itself,
  - preserves native behavior for nested controls.
- Click on row focuses row (keyboard continuity).

### Send-specific search shortcut (`SearchAvatar.svelte`)
- In `searchType='send'`, pressing `Enter` in search input auto-selects when exactly one result is present.

## 3.3 Send amount-step specific keyboard behavior

### Enter-to-continue
- In `3_Amount.svelte`, Enter on `[data-send-amount-input]` calls continue path when `canContinue` is true.

### Backspace-to-edit-recipient
- In `CurrencyInput.svelte`, Backspace when input is empty and caret at start triggers `onBackspaceAtEmpty`.
- Send maps this to:
  - navigate back to Recipient,
  - autofocus recipient search,
  - place cursor at end of input value.

## 3.4 Focus data-attribute conventions

Current app uses two parallel attribute families:
- generic: `data-popup-initial-input`, `data-popup-initial-focus`
- send-specific legacy/current: `data-send-step-initial-input`, `data-send-step-initial-focus`

**Migration contract (explicit):**
- New steps must set only generic attributes (`data-popup-initial-input|focus`).
- Send-specific attributes are legacy-compatibility markers and must not be newly introduced.
- `PopupHost` continues to read both during migration.
- At a defined cutoff, send-specific selectors should be removed from `PopupHost` after migration completion.

## 3.5 Top-of-stack focus lifecycle (important implementation detail)

Popup pages remain mounted; only the top page is active/visible. Initial focus is therefore applied on **top-page key change**, not on component mount.  
Implication: step components should not rely on `onMount(() => focus(...))` for return paths (e.g. `popTo`), because the component can already be mounted.

## 3.6 Cross-flow transition pattern (flow A → flow B)

Some UX paths intentionally terminate one flow and start another (example: AddContact → Untrust).

### Contract
- Allowed: close current flow, then open a new top-level flow.
- Forbidden: `openStep` into unrelated domain flow while preserving old stack context/title semantics.
- Required:
  1. explicit close boundary,
  2. explicit new flow title/context,
  3. explicit post-completion return behavior (where focus/user lands when flow B ends).

---

## 3.7 Accessibility semantics and announcements (required)

Keyboard/focus is necessary but insufficient. Multi-step flows must also satisfy semantic/accessibility requirements:

- Dialogs must have stable heading semantics (`aria-labelledby`/title consistency).
- Interactive non-button rows must provide explicit semantics (`role`, `tabindex`, descriptive label strategy).
- Error and async state messaging should be announced appropriately (`aria-live` where relevant for dynamic validation/task failures).
- Section headings and field grouping should remain meaningful when read by assistive tech.
- Focus-visible styling must be present for all keyboard-reachable controls.

### Testable accessibility checks
- Every step has one programmatic heading that matches visible step title.
- Interactive rows expose both role and accessible name; if `role="button"`, Enter/Space activation semantics must work.
- Validation/warning messaging cannot rely on color alone.
- Progress comprehension must not depend on animation only; transitions should respect `prefers-reduced-motion`.

---

## 4) Gap analysis vs Send (by domain)

## 4.1 Strong but incomplete parity

### Settings / Gateway
**Strengths**
- Multi-step structure present.
- Good runtime migration (`openStep`) in trust flows.
- Explicit validate-and-confirm stages.

**Gaps to close**
- Missing step progress framing (`FlowStepHeader`).
- Inconsistent explicit initial-focus annotations.
- CTA wording inconsistency across steps.

### Groups / Create Group
**Strengths**
- Clear staged data capture and review.
- Derived validation and controlled continuation.

**Gaps**
- No explicit visual progress model matching Send.
- Keyboard guidance relies mostly on defaults.
- Validation messaging style not unified with Send alert/action pattern.

## 4.2 Functional but inconsistent UX system

### Wallet / MigrateToV2
- Flow works, but much lighter step orientation and keyboard ergonomics than Send.
- Needs stronger review/edit semantics and a consistent visual/interaction shell.

### Market / Offer and Checkout
- Rich domain logic and validation, but weaker shared flow framing.
- Some step transitions still use `popupControls.open` directly (within chained steps).
- Focus/keyboard affordances are less explicit and less systematic than Send.

## 4.3 Most divergent from gold standard

### Contacts / AddContact
- Minimal orientation scaffolding.
- No progress display and sparse action hierarchy.

### Groups / ManageGroupMembers
- Utility-heavy single page in popup without strong step semantics.
- Keyboard and focus are not shaped as first-class flow behavior.

### Admin / NewConnection + NewProduct
- Most inconsistent with Send model:
  - direct popup step opens,
  - missing standard step header/progress,
  - inconsistent form/validation/CTA presentation,
  - no explicit focus contract.

## 4.4 Naming and title consistency note

Step title must reflect the **primary task on screen**, not filename/domain label.  
Current Send chain shows a known mismatch risk: `2_Asset.svelte` header title is “Amount” with subtitle “Choose route”. This works UX-wise but can cause naming drift in future flows unless title-vs-task policy is explicit.

---

## 5) Unified UX system specification (target architecture)

## 5.1 Flow composition contract (required)

Each multi-step flow must follow:

1. **Step shell**
   - `FlowDecoration`
   - `FlowStepHeader` (mandatory for 3+ steps, recommended for 2-step chains)

2. **Primary decision area**
   - One dominant task per step.

3. **Support/feedback area**
   - Inline warnings/errors/info.
   - Optional progressive disclosure for advanced settings.

4. **Action area**
   - Primary action right-aligned.
   - Optional secondary action with lower emphasis.

## 5.2 Navigation contract (required)

- Use `openStep` for forward transitions.
- Use `popTo` + fallback `openStep` for review edits.
- Preserve context object continuity across all steps.
- Keep popup stack behavior predictable (no silent close/reopen jumps unless intentional and documented).
- Use route navigation only for page-level flows or explicit deep-link wrappers.

## 5.3 Focus contract (required)

- Every step must declare an initial focus target:
  - first preference: `data-popup-initial-input`
  - fallback: `data-popup-initial-focus`
- First interactive control must be keyboard reachable and visible focusable.
- Search/list steps must support ArrowDown handoff + row keyboard navigation.
- Step focus logic must be compatible with top-of-stack activation (not only first mount).

## 5.4 Validation contract (required)

- `canContinue` must be derived from field validity + readiness state.
- Continue/Confirm disabled state must match validation model.
- Blocking issues shown inline near relevant fields; global alerts only for step-level failures.
- Error copy pattern:
  - **What is wrong**,
  - **Why it matters**,
  - **What to do now**.

### Blocking vs non-blocking rules
- **Blocking error**:
  - disables primary CTA,
  - shown nearest relevant control,
  - must include actionable correction hint.
- **Non-blocking warning**:
  - CTA remains enabled,
  - warning remains visible,
  - must not rely on color-only signaling.
- **Global alert policy**:
  - only for step-level/system-level failures,
  - single-active global alert per step context (replace, do not stack indefinitely).

## 5.5 Review-step contract (required)

- Must show concise summary of critical choices.
- Must provide targeted edit actions (Recipient/Route/Amount pattern generalized).
- Final CTA language must clearly state commitment (`Send`, `Publish`, `Create`, `Confirm`).

## 5.6 Unsaved changes and destructive back contract (required)

Flows must explicitly choose one of these patterns and document it in the flow entry contract:

1. **Write-through context pattern** (preferred)
   - step inputs write to shared context as source of truth,
   - back/close does not silently lose step-local state.

2. **Dirty-state confirmation pattern**
   - local draft state is allowed,
   - destructive back/close prompts explicit discard confirmation.

Mixing both in one flow without clear boundaries is forbidden.

---

## 6) Unified design system specification (components and patterns)

## 6.1 Core primitives

Existing anchors:
- `FlowDecoration`
- `FlowStepHeader`
- `RowFrame`
- `ListShell` + list keyboard utils
- `ActionButton`

Recommended additions:
- **`StepActionBar`** (new)
  - standard CTA layout, disabled/loading handling.
- **`StepAlert`** (new)
  - normalized alert variants with optional action slot.
- **`StepSection`** (new)
  - titled section wrapper for complex forms.
- **`StepReviewRow`** (new)
  - read-only row with optional “Change” action.

## 6.2 Input pattern catalog

### A) Search-select pattern
- Search input with explicit initial input marker.
- ArrowDown moves into results list.
- Rows keyboard-navigable and activatable.
- Optional Enter single-match quick-select.

### B) Amount input pattern
- Masked decimal input, “Use max”, available/cap helper text.
- Enter continues if valid.
- Optional Backspace-at-empty to return/edit prior selector.

### C) Address/entity picker pattern
- Row-based card entries using `RowFrame` and avatar identity.
- Clear selected state and deterministic row keying.

### D) Advanced options pattern
- Collapsible section under primary path.
- Zero-impact defaults with explicit opt-in complexity.

### E) Review + commit pattern
- Structured summary grouped by domain sections.
- Change actions route to exact prior step.
- Final commit button isolated and explicit.

## 6.3 Copy and semantic patterns

- Step titles are short and concrete.
- Subtitles explain intent in one line.
- Step title must match current on-screen task.
- Button language standardized:
  - intermediate step primary: `Continue`
  - review step primary: commitment verb (`Send`, `Publish`, `Create`, `Pay`)
  - `Back` and `Cancel` reserved for non-committing navigation
  - if there is a dedicated post-review confirm step: primary label is `Confirm`, and title/subtitle must clearly state what is being confirmed.
- Avoid mixed tense and ambiguous labels (`Next`, `Done`, `Apply`) unless semantically required.

---

## 6.4 Two-step flow guidance

For 2-step flows, progress headers are optional but recommended when:
- step purpose is non-obvious,
- user may re-enter/edit,
- there is meaningful review/confirmation complexity.

If no `FlowStepHeader` is shown, flow must still provide:
- clear step title,
- deterministic action hierarchy,
- explicit back/close semantics,
- explicit initial focus marker.

## 6.5 Async action UX contract

- Long-running chain/network actions should use shared task feedback (`runTask`) for consistent global behavior.
- During async submit:
  - primary action enters loading/working state,
  - duplicate submits are prevented,
  - disabled states are semantically consistent.
- Errors must have a defined surfacing policy per step:
  - inline (field/step-level recoverable issues),
  - global/task feedback (transaction/infrastructure failures).

---

## 7) Implementation roadmap (prioritized)

## P0 — Consistency foundation
1. Add step headers/progress to all active multi-step flows.
2. Add explicit initial focus/input attributes on all steps.
3. Standardize CTA semantics and placement.
4. Replace remaining chained-step `popupControls.open` with runtime step APIs where appropriate.
5. Introduce lightweight flow inventory/checklist gate in PR template to prevent immediate drift.

## P1 — Interaction parity
6. Implement `canContinue` + actionable inline validation on all steps.
7. Add review-step targeted edit loops across flows.
8. Apply shared list keyboard navigator patterns everywhere search/list selection is used.
9. Add checklist/lint rules for flow contracts (focus marker, step shell, CTA semantics, validation behavior).

## P2 — System hardening
10. Introduce `StepActionBar`, `StepAlert`, `StepSection`, `StepReviewRow`.
11. Add focused UX tests for keyboard/focus contracts (tab loop, enter/escape/backspace semantics).

---

## 8) Domain-specific refactor priorities

Highest ROI sequence:

1. **Admin flows** (largest divergence; most visible consistency gain)
2. **Market offer + checkout** (high complexity; high standardization value)
3. **Wallet migrateToV2 + Contacts addContact**
4. **Groups create/manage + Gateway polish**

Rationale: this order maximizes quality gains while converging the most fragmented chains first.

---

## 9) Definition of done for any multi-step flow

A flow is “gold-standard compliant” only if all are true:

1. Uses step runtime API and deterministic stack behavior.
2. Shows step progress/orientation.
3. Declares initial focus target.
4. Supports complete keyboard path without mouse.
5. Uses derived validity for CTA enabling.
6. Provides actionable, localized validation feedback.
7. Has review step with targeted edit navigation.
8. Uses consistent CTA/copy semantics.
9. Keeps advanced controls progressive and non-blocking.
10. Passes focused interaction tests for keyboard/focus behavior.

---

## 9.1 Per-step implementation checklist (execution-ready)

Use this checklist for each step in a flow:

1. Initial focus marker exists (`data-popup-initial-input` preferred).
2. Keyboard navigation works:
   - Tab/Shift+Tab trap behaves correctly,
   - Enter behavior is intentional,
   - Escape behavior is intentional,
   - Backspace behavior is intentional (no accidental clashes with text editing).
3. CTA disabled/loading state matches derived validity/readiness.
4. Validation copy follows “what / why / now what”.
5. Async actions use consistent task UX and duplicate-submit protection.
6. Row/list interactions expose proper semantics and focus-visible styles.
7. Return/edit path preserves context and stack expectations.

## 9.2 Flow entry template (folder-level checklist)

Each flow folder should include a short “entry contract” note (README or top-of-file block) covering:

1. Step list and primary task per step.
2. Shared context shape and source-of-truth policy.
3. Navigation layers used (`openStep`, `popTo`, route usage if any).
4. Entry behavior (how flow starts, including deep-link behavior if applicable).
5. Exit behavior (close destination, post-close navigation, focus return anchor).
6. Review/edit map (which review fields jump to which prior steps).
7. Async action and validation model (blocking vs warning behavior).

---

## 10) Summary

The Send flow already demonstrates the target interaction architecture: explicit step orientation, robust keyboard/focus behavior, high-quality validation semantics, and clean edit loops. The app now needs systematic convergence, not ad-hoc polishing. This blueprint defines that convergence path as a reusable UX/design system for both refactoring existing flows and building new flows with consistent quality from day one.
