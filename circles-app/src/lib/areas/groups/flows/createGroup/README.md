# Groups `createGroup` Flow Entry Contract

## Step map
1. `1_CreateGroup.svelte` — group symbol and profile basics.
2. `2_Settings.svelte` — simple vs advanced technical settings.
3. `3_Review.svelte` — review all group choices.
4. `4_Create.svelte` — confirm and execute on-chain creation.

## Shared context + source of truth
- Context type: `CreateGroupFlowContext` (`./context.ts`).
- Pattern: write-through context store (`createGroupContext`) across steps.

## Navigation layers
- In-flow transitions use runtime `openStep(...)`.
- Flow close uses popup stack control; context reset on close path.

## Entry behavior
- Flow opens from group-creation entry points and initializes defaults from wallet where applicable.

## Exit behavior
- On successful create, callback `setGroup` is invoked for parent integration.
- Flow closes via popup controls; focus restoration handled by popup host.

## Validation + async model
- Derived validity gates continuation on symbol/name/on-chain-name and advanced address checks.
- Create step uses `runTask(...)` with preflight checks and duplicate-submit-safe async handling.
