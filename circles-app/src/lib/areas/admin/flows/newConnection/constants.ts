export const NEW_CONNECTION_STEP_LABELS = ['Seller', 'Details'] as const;
export const NEW_CONNECTION_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 2,
  labels: NEW_CONNECTION_STEP_LABELS,
} as const;
