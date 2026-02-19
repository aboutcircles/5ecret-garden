# Market `offer` Flow Entry Contract

## Step map
1. `1_Product.svelte` — product core details and media.
2. `2_Pricing.svelte` — price, gateway, and checkout requirements.
3. `3_PreviewPublish.svelte` — review and publish.

## Shared context + source of truth
- Context type: `OfferFlowContext` (`./types`).
- Pattern: write-through draft (`context.draft`) across steps.

## Navigation layers
- In-flow progression uses `openStep(...)`.
- Flow boundary exit uses popup close (and route navigation only for explicit settings jump).

## Entry behavior
- Flow is opened from market/admin offer entry points with operator context.

## Exit behavior
- On publish success, flow closes via popup controls.
- Focus return handled by popup host restoration.

## Validation + async model
- Blocking checks on required product, price, and payment gateway fields.
- Publish uses async task feedback (`runTask`) and disables action via state.
