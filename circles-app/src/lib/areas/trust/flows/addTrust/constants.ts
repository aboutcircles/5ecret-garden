export const ADD_TRUST_STEP_LABELS: string[] = ['Pick accounts', 'Confirm trust'];

export const ADD_TRUST_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 2,
  labels: ADD_TRUST_STEP_LABELS,
} as const;
