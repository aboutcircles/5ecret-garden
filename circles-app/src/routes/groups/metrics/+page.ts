import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  // We'll handle the redirect in the component's onMount instead
  // since we need to access the store which isn't available here
  
  return {
    title: 'Group Metrics Dashboard'
  };
};
