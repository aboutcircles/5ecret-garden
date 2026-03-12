import {
  type CirclesEventType,
  type EventRow,
  type GroupRow,
  type PagedQueryParams,
} from '@aboutcircles/sdk-types';
import { PagedQuery } from '@aboutcircles/sdk-rpc';
import { get } from 'svelte/store';
import { createCirclesQueryStore, pagedQueryToCirclesQuery } from '$lib/shared/state/query';
import { circles } from '$lib/shared/state/circles';
import type { Avatar } from '@aboutcircles/sdk';

const groupEvents: Set<CirclesEventType> = new Set([]);

export const createCMGroups = (avatar: Avatar) => {

  const circlesInstance = get(circles);
  if (!circlesInstance) {
    throw new Error('Circles instance not found');
  }

  const queryDefinition: PagedQueryParams = {
    table: 'Groups',
    namespace: 'V_CrcV2',
    limit: 25,
    columns: [],
    sortOrder: 'DESC',
    filter: [{
      Type: 'Conjunction',
      ConjunctionType: 'Or',
      Predicates: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'type',
          Value: 'CrcV2_BaseGroupCreated',
        },
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'type',
          Value: 'CrcV2_CMGroupCreated',
        },
      ],
    }],
  };

  return createCirclesQueryStore<GroupRow>(
    avatar,
    async () => pagedQueryToCirclesQuery(
      new PagedQuery<GroupRow>(circlesInstance.rpc.client, queryDefinition)
    ),
    groupEvents,
  );
};
