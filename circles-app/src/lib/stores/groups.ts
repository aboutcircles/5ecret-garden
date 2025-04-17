import {
  CalculatedColumn,
  type CirclesEventType,
  CirclesQuery,
  type EventRow,
  type GroupRow,
  type PagedQueryParams,
} from '@circles-sdk/data';
import { get } from 'svelte/store';
import { createCirclesQueryStore } from '$lib/stores/query/circlesQueryStore';
import { circles } from '$lib/stores/circles';

const groupEvents: Set<CirclesEventType> = new Set([]);

export interface CMGroupRow extends EventRow {
  group: string;
  mint: string;
  treasury: string;
  name: string;
  symbol: string;
  isMember?: boolean;
  cidV0Digest?: string;
  memberCount?: number;
  trustedCount?: number;
}

export const createCMGroups = () => {

  const $circles = get(circles);
  if (!$circles) {
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
    async () => new CirclesQuery<GroupRow>($circles.circlesRpc, queryDefinition),
    groupEvents,
  );
};