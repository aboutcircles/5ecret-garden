export const GATEWAY_PROFILE_STEP_LABELS = ['Gateway profile', 'Confirm'] as const;
export const GATEWAY_PROFILE_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 2,
  labels: GATEWAY_PROFILE_STEP_LABELS,
} as const;

export const GATEWAY_TRUST_STEP_LABELS = ['Search account', 'Confirm trust'] as const;
export const GATEWAY_TRUST_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 2,
  labels: GATEWAY_TRUST_STEP_LABELS,
} as const;

export const GATEWAY_UNTRUST_STEP_LABELS = ['Search account', 'Remove trust'] as const;
export const GATEWAY_UNTRUST_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 2,
  labels: GATEWAY_UNTRUST_STEP_LABELS,
} as const;

export const GATEWAY_MANAGE_TRUST_STEP_LABELS = ['Manage trust'] as const;
export const GATEWAY_MANAGE_TRUST_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 1,
  labels: GATEWAY_MANAGE_TRUST_STEP_LABELS,
} as const;
