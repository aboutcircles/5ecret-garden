export const ADD_CONTACT_STEP_LABELS = ['Find account', 'Trust status'] as const;
export const ADD_CONTACT_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 2,
  labels: ADD_CONTACT_STEP_LABELS,
} as const;
