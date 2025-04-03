import {
  type CirclesEventType,
  CirclesQuery,
  type EventRow,
  type GroupRow,
  type PagedQueryParams,
  CalculatedColumn,
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
    table: 'CMGroupCreated',
    namespace: 'CrcV2',
    limit: 25,
    columns: [],
    sortOrder: 'DESC',
    filter: [],
  };

  return createCirclesQueryStore<GroupRow>(
    async () => new CirclesQuery<GroupRow>($circles.circlesRpc, queryDefinition, [
      new CalculatedColumn('group', (o: any) =>  (<any>o).proxy),
      new CalculatedColumn('mint', (o: any) => (<any>o).mint),
      new CalculatedColumn('treasury', (o: any) => ''),
      new CalculatedColumn('symbol', (o: any) => ''),
      new CalculatedColumn('cidV0Digest', (o: any) => ''),
      new CalculatedColumn('memberCount', (o: any) => 0),
      new CalculatedColumn('trustedCount', (o: any) => 0),
    ]),
    groupEvents,
  );
};