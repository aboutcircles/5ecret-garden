# Settings `gateway` Flow Entry Contract

## Step maps

### Create gateway chain
1. `CreateGatewayProfile.svelte` — define gateway profile + on-chain name.
2. `ConfirmCreateGateway.svelte` — review and create gateway.

### Manage trust chain
1. `ManageTrust.svelte` — list trusted accounts and choose add/remove actions.
2. `ConfirmGatewayUntrust.svelte` — confirm trust removal transaction.

## Shared context + source of truth
- Gateway creation uses `CreateGatewayFlowContext` (`./context.ts`) with write-through context across create/confirm steps.
- Trust management uses gateway address + selected receiver passed via step props.

## Navigation layers
- In-flow transitions use runtime `openStep(...)`.
- Close and return behavior use popup stack controls (`popupControls.close()`).

## Entry behavior
- Flows open from settings/gateway management entry points in popup shell.
- Initial focus markers are explicit on profile/search/management surfaces.

## Exit behavior
- Create flow closes after task completion and optionally reports created gateway via callback.
- Trust/untrust confirm flows close on success and trigger parent list refresh callbacks.

## Validation + async model
- Derived validity gates continue/confirm CTAs (on-chain name, profile name, address validity).
- On-chain actions run through `runTask(...)` for consistent async UX and duplicate-submit safety.
