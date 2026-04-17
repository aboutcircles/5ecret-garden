export const MIGRATE_STEP_LABELS = ['Invitation', 'Profile', 'Contacts', 'Migrate'] as const;
export const MIGRATE_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 4,
  labels: MIGRATE_STEP_LABELS,
} as const;
