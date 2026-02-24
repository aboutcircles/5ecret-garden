export type RequirementItem = {
  key: string;
  label: string;
  slot: string;
  parentSlot?: string;
};

export type RequirementGroup = {
  id: string;
  title: string;
  layout: 'grid' | 'tree';
  allKeys: string[];
  items: RequirementItem[];
  parent?: RequirementItem;
  treeLabel?: string;
};

export const REQUIRED_SLOT_GROUPS: RequirementGroup[] = [
  {
    id: 'customer',
    title: 'Customer identification',
    layout: 'grid',
    allKeys: ['customer'],
    items: [
      {
        key: 'customer',
        label: 'Require buyer first and last name',
        slot: 'customer',
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    layout: 'grid',
    allKeys: ['contactPoint.email', 'contactPoint.telephone'],
    items: [
      {
        key: 'contactPoint.email',
        label: 'Require buyer email at checkout',
        slot: 'contactPoint.email',
      },
      {
        key: 'contactPoint.telephone',
        label: 'Require buyer phone at checkout',
        slot: 'contactPoint.telephone',
      },
    ],
  },
  {
    id: 'age',
    title: 'Age verification',
    layout: 'tree',
    treeLabel: 'Age verification slots',
    allKeys: ['ageProof', 'ageProof.birthDate'],
    parent: {
      key: 'ageProof',
      label: 'Require age proof object',
      slot: 'ageProof',
    },
    items: [
      {
        key: 'ageProof.birthDate',
        label: 'Require date of birth',
        slot: 'ageProof.birthDate',
        parentSlot: 'ageProof',
      },
    ],
  },
  {
    id: 'shipping',
    title: 'Shipping address',
    layout: 'tree',
    treeLabel: 'Shipping address slots',
    allKeys: [
      'shippingAddress',
      'shippingAddress.streetAddress',
      'shippingAddress.addressLocality',
      'shippingAddress.postalCode',
      'shippingAddress.addressCountry',
    ],
    parent: {
      key: 'shippingAddress',
      label: 'Require shipping address object',
      slot: 'shippingAddress',
    },
    items: [
      {
        key: 'shippingAddress.streetAddress',
        label: 'Require shipping street address',
        slot: 'shippingAddress.streetAddress',
        parentSlot: 'shippingAddress',
      },
      {
        key: 'shippingAddress.addressLocality',
        label: 'Require shipping city/locality',
        slot: 'shippingAddress.addressLocality',
        parentSlot: 'shippingAddress',
      },
      {
        key: 'shippingAddress.postalCode',
        label: 'Require shipping postal code',
        slot: 'shippingAddress.postalCode',
        parentSlot: 'shippingAddress',
      },
      {
        key: 'shippingAddress.addressCountry',
        label: 'Require shipping country',
        slot: 'shippingAddress.addressCountry',
        parentSlot: 'shippingAddress',
      },
    ],
  },
  {
    id: 'billing',
    title: 'Billing address',
    layout: 'tree',
    treeLabel: 'Billing address slots',
    allKeys: [
      'billingAddress',
      'billingAddress.streetAddress',
      'billingAddress.addressLocality',
      'billingAddress.postalCode',
      'billingAddress.addressCountry',
    ],
    parent: {
      key: 'billingAddress',
      label: 'Require billing address object',
      slot: 'billingAddress',
    },
    items: [
      {
        key: 'billingAddress.streetAddress',
        label: 'Require billing street address',
        slot: 'billingAddress.streetAddress',
        parentSlot: 'billingAddress',
      },
      {
        key: 'billingAddress.addressLocality',
        label: 'Require billing city/locality',
        slot: 'billingAddress.addressLocality',
        parentSlot: 'billingAddress',
      },
      {
        key: 'billingAddress.postalCode',
        label: 'Require billing postal code',
        slot: 'billingAddress.postalCode',
        parentSlot: 'billingAddress',
      },
      {
        key: 'billingAddress.addressCountry',
        label: 'Require billing country',
        slot: 'billingAddress.addressCountry',
        parentSlot: 'billingAddress',
      },
    ],
  },
];

export function deriveRequiredSlotsState(initialSlots?: string[]) {
  const normalized = (initialSlots ?? []).map(s => s.trim()).filter(s => s.length > 0);
  const allKeys = REQUIRED_SLOT_GROUPS.flatMap(g => g.allKeys);
  const state: Record<string, boolean> = {};
  for (const key of allKeys) {
    state[key] = normalized.includes(key);
  }
  return state;
}

export function computeRequiredSlotsFromSelections(state: Record<string, boolean>): string[] | undefined {
  const selected = Object.entries(state)
    .filter(([_, checked]) => checked)
    .map(([key]) => key);
  return selected.length ? selected : undefined;
}

export function deriveFormRequirements(allRequiredSlots: Set<string>) {
  const shippingRequired =
    allRequiredSlots.has('shippingAddress') ||
    allRequiredSlots.has('shippingAddress.streetAddress') ||
    allRequiredSlots.has('shippingAddress.addressLocality') ||
    allRequiredSlots.has('shippingAddress.postalCode') ||
    allRequiredSlots.has('shippingAddress.addressCountry');

  const billingRequired =
    allRequiredSlots.has('billingAddress') ||
    allRequiredSlots.has('billingAddress.streetAddress') ||
    allRequiredSlots.has('billingAddress.addressLocality') ||
    allRequiredSlots.has('billingAddress.postalCode') ||
    allRequiredSlots.has('billingAddress.addressCountry');

  return {
    customerRequired: allRequiredSlots.has('customer'),
    emailRequired: allRequiredSlots.has('contactPoint.email'),
    phoneRequired: allRequiredSlots.has('contactPoint.telephone'),
    birthDateRequired: allRequiredSlots.has('ageProof.birthDate') || allRequiredSlots.has('ageProof'),
    
    shippingRequired,
    shipStreetRequired: allRequiredSlots.has('shippingAddress.streetAddress') || shippingRequired,
    shipLocalityRequired: allRequiredSlots.has('shippingAddress.addressLocality') || shippingRequired,
    shipPostalRequired: allRequiredSlots.has('shippingAddress.postalCode') || shippingRequired,
    shipCountryRequired: allRequiredSlots.has('shippingAddress.addressCountry') || shippingRequired,
    
    billingRequired,
    billStreetRequired: allRequiredSlots.has('billingAddress.streetAddress') || billingRequired,
    billLocalityRequired: allRequiredSlots.has('billingAddress.addressLocality') || billingRequired,
    billPostalRequired: allRequiredSlots.has('billingAddress.postalCode') || billingRequired,
    billCountryRequired: allRequiredSlots.has('billingAddress.addressCountry') || billingRequired,
  };
}
