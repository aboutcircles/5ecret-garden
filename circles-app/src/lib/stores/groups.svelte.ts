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
import type { Avatar } from '@circles-sdk/sdk';

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

export const createCMGroups = (avatar: Avatar) => {

  const circlesInstance = get(circles);
  if (!circlesInstance) {
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
    avatar,
    async () => new CirclesQuery<GroupRow>(circlesInstance.circlesRpc, queryDefinition, [
      new CalculatedColumn('group', (o: any) => (<any>o).proxy),
      new CalculatedColumn('mint', (o: any) => (<any>o).mint),
      new CalculatedColumn('treasury', async () => ''),
      new CalculatedColumn('symbol', async () => ''),
      new CalculatedColumn('cidV0Digest', async () => ''),
      new CalculatedColumn('memberCount', async () => 0),
      new CalculatedColumn('trustedCount', async () => 0),
    ]),
    groupEvents,
  );
};