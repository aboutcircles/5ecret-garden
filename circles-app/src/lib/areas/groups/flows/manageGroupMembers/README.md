# Groups `manageGroupMembers` Flow Entry Contract

## Step map
1. `1_manageGroupMembers.svelte` — manage member list via direct address input, CSV import, and search actions.

## Shared context + source of truth
- Context type: `ManageGroupMembersFlowContext` (`./context.ts`).
- Pattern: single-step local state with explicit selected-address handoff for search actions.

## Navigation layers
- In-flow action transitions use runtime `openStep(...)` for Invite/Trust popup actions.
- Primary screen remains a single-step utility flow.

## Entry behavior
- Flow opens from group management entry points in popup shell.
- Initial keyboard focus targets the address textarea.

## Exit behavior
- Follow-up actions (Invite/Trust) open dedicated flows.
- Focus restoration and close behavior are popup-host managed.

## Validation + async model
- Address input sanitized and validated with `ethers.isAddress`.
- Action errors are surfaced inline (`StepAlert`) and avoid silent failures.
