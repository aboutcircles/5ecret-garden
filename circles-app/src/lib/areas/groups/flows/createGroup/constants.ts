export const CREATE_GROUP_STEP_LABELS = ['Create group', 'Settings', 'Review', 'Create'] as const;
export const CREATE_GROUP_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 4,
  labels: CREATE_GROUP_STEP_LABELS,
} as const;
