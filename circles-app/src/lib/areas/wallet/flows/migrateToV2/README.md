# Wallet `migrateToV2` Flow Entry Contract

## Step map
1. `1_GetInvited.svelte` — choose invitation path or self-migrate path.
2. `2_CreateProfile.svelte` — create/update V2 profile details.
3. `3_MigrateContacts.svelte` — select contacts to migrate.
4. `4_Migrate.svelte` — confirm and run migration.

## Shared context + source of truth
- Context type: `MigrateToV2Context` (`./context.ts`).
- Pattern: write-through context (`inviter`, `profile`, `trustList`) across steps.

## Navigation layers
- In-flow progression uses flow runtime API: `openStep(...)`.
- Final flow exit uses popup-stack close (`popupControls.close()`) after successful migration.

## Entry behavior
- Flow starts from wallet migration entry points and opens in popup shell.
- Step 1 loads invitations and self-migration capability before user chooses path.

## Exit behavior
- On successful `migrateAvatar(...)`, flow closes.
- Focus restoration is handled by popup host lifecycle.

## Validation + async model
- Profile step blocks continuation on invalid profile fields/image constraints.
- Migration action uses `runTask(...)` for async feedback and duplicate-submit prevention.
