export const CREATE_GROUP_STEP_LABELS = ['Create group', 'Settings', 'Review'] as const;
export const CREATE_GROUP_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 3,
  labels: CREATE_GROUP_STEP_LABELS,
} as const;
