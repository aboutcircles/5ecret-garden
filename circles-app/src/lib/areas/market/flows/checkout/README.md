# Market `checkout` Flow Entry Contract

## Step map
1. `CartPanel.svelte` — review basket and start checkout.
2. `CheckoutForms.svelte` — provide required customer/details fields.
3. `CheckoutReview.svelte` — review order before checkout submission.
4. `CheckoutPayment.svelte` — execute payment via QR or in-app transfer.

## Shared context + source of truth
- Source of truth is cart state (`cartState`) and basket/order APIs.
- Pattern: write-through updates via `updateBasketDetails` and server validation.

## Navigation layers
- In-flow transitions use `openStep(...)`.
- Popup close uses popup controls at explicit boundaries.

## Entry behavior
- Checkout starts from cart panel popup.
- Validation decides whether to route to details step or directly to review.

## Exit behavior
- Payment completion is handled in downstream payment/send flows.
- Focus return handled by popup host lifecycle.

## Validation + async model
- Validation is server-driven (`validateCart`) with field-level requirement mapping.
- Blocking unmet requirements prevent progression to review/payment.
- Async stages use loading states and task-driven feedback.
