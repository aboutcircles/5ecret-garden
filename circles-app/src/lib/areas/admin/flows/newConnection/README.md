# Admin `newConnection` Flow Entry Contract

## Step map
1. `1_Seller.svelte` — select seller avatar.
2. `2_Details.svelte` — enter Odoo connection details and create connection.

## Shared context + source of truth
- Context type: `AdminNewConnectionFlowContext` (`./context.ts`).
- Pattern: write-through context across steps.

## Navigation layers
- Forward step transitions use flow runtime API: `openStep(...)`.
- Popup close behavior remains popup-stack controlled by caller / host.

## Entry behavior
- Flow is opened from `routes/admin/+page.svelte` via popup.
- Initial step is seller selection.

## Exit behavior
- On successful create, parent `onCreate` callback handles persistence + closes popup in route layer.
- Focus return is handled by popup host focus restoration.

## Validation + async model
- Blocking validation in details step for required seller and required Odoo fields.
- Errors surfaced inline via `StepAlert`.
- Submit uses loading state to prevent duplicate action.
