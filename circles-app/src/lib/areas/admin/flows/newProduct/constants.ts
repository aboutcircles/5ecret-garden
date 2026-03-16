export const NEW_PRODUCT_STEP_LABELS = ['Seller', 'Catalog', 'Type', 'Connection', 'Details', 'Summary'] as const;
export const NEW_PRODUCT_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 6,
  labels: NEW_PRODUCT_STEP_LABELS,
} as const;

export const NEW_PRODUCT_SELECTION_STEP_LABELS = ['Seller', 'Catalog', 'Type'] as const;
export const NEW_PRODUCT_SELECTION_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 3,
  labels: NEW_PRODUCT_SELECTION_STEP_LABELS,
} as const;

export const NEW_PRODUCT_FULFILLMENT_STEP_LABELS = ['Connection', 'Details', 'Summary'] as const;
export const NEW_PRODUCT_FULFILLMENT_FLOW_SCAFFOLD_BASE = {
  className: 'w-full space-y-4',
  total: 3,
  labels: NEW_PRODUCT_FULFILLMENT_STEP_LABELS,
} as const;
