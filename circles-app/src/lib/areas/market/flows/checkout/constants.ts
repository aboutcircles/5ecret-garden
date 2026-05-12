export const CHECKOUT_STEP_LABELS = ['Cart', 'Details', 'Review', 'Prepare payment', 'Payment'] as const;
export const CHECKOUT_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 5,
  labels: CHECKOUT_STEP_LABELS,
} as const;
