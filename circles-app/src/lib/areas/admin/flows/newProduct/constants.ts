export const NEW_PRODUCT_STEP_LABELS = ['Seller', 'Catalog', 'Type', 'Connection', 'Details', 'Summary'] as const;
export const NEW_PRODUCT_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 6,
  labels: NEW_PRODUCT_STEP_LABELS,
} as const;
