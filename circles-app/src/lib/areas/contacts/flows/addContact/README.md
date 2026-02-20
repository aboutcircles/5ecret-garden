# Contacts `addContact` Flow Entry Contract

## Step map
1. `1_Search.svelte` — search and select account to add/trust.
2. `2_YouAlreadyTrust.svelte` — handle already-trusted state and optional untrust path.

## Shared context + source of truth
- Context type: `AddContactFlowContext` (`./context.ts`).
- Pattern: write-through context (`selectedAddress`, `trustVersion`) between steps.

## Navigation layers
- In-flow transitions use flow runtime API: `openStep(...)`.
- Cross-flow transition (AddContact → Untrust) uses explicit close boundary (`popupControls.close()`), then opens new top-level flow, matching blueprint section 3.6.

## Entry behavior
- Flow starts from contacts add-contact action and opens in popup shell.
- Search step supports keyboard list navigation via shared list utilities in `SearchAvatar`.

## Exit behavior
- Success/non-action exit uses popup close.
- Optional untrust branch opens a separate flow after explicit close.
- Focus restoration is handled by popup host lifecycle.

## Validation + async model
- Selection validity is driven by search result selection and relation lookup.
- Already-trusted path provides explicit user choice (Done vs Untrust).
