import {
  type CirclesEventType,
  CirclesQuery,
  type EventRow,
  type GroupRow,
  type PagedQueryParams,
} from '@circles-sdk/data';
import { get } from 'svelte/store';
import { createCirclesQueryStore } from '$lib/shared/state/query';
import { circles } from '$lib/shared/state/circles';
import type { Avatar } from '@circles-sdk/sdk';

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
      Type: 'FilterPredicate',
      FilterType: 'In',
      Column: 'type',
      Value: ['CrcV2_BaseGroupCreated', 'CrcV2_CMGroupCreated'],
    }],
  };

  return createCirclesQueryStore<GroupRow>(
    avatar,
    async () => new CirclesQuery<GroupRow>(circlesInstance.circlesRpc, queryDefinition),
    groupEvents,
  );
};