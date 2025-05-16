import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {

  return {
    title: 'Group Metrics Dashboard',
    group: params.group
  };
};
