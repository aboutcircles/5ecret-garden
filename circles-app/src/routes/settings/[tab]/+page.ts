import { redirect } from '@sveltejs/kit';

const TAB_IDS = new Set(['personal', 'orders', 'keys', 'namespaces', 'marketplace', 'payment']);

export function load({ params }) {
  if (!TAB_IDS.has(params.tab)) {
    throw redirect(302, '/settings/personal');
  }
}
