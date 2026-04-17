export const OFFER_STEP_LABELS = ['Product', 'Pricing', 'Review'] as const;
export const OFFER_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 3,
  labels: OFFER_STEP_LABELS,
} as const;
