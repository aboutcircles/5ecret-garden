# Admin `newProduct` Flow Entry Contract

## Step map
1. `1_Seller.svelte` — select seller avatar.
2. `2_Catalog.svelte` — select catalog product.
3. `3_Type.svelte` — choose fulfillment type.
4. `4_CreateOdooConnection.svelte` — optional Odoo connection creation.
5. `5_Details.svelte` — configure type-specific details.
6. `6_Summary.svelte` — review and apply.

## Shared context + source of truth
- Context type: `AdminNewProductFlowContext` (`./context.ts`).
- Pattern: write-through context across the full chain.

## Navigation layers
- In-flow progression uses `openStep(...)` from flow runtime.
- Popup close/cancel uses popup controls only at explicit flow boundaries.

## Entry behavior
- Flow is opened from `routes/admin/+page.svelte` as popup wizard.

## Exit behavior
- Final summary executes `onExecute(...)` payload.
- Parent layer handles persistence refresh and close behavior.

## Validation + async model
- Per-step blocking validation before progression.
- Inline error messaging uses `StepAlert` on updated steps.
- Submit/apply actions expose loading states to prevent duplicate submit.
