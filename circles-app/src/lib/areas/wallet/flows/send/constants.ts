export const SEND_POPUP_TITLE = 'Send Circles';
export const SEND_STEP_LABELS = ['Recipient', 'Amount', 'Review'] as const;
export const SEND_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 3,
  labels: SEND_STEP_LABELS,
} as const;
