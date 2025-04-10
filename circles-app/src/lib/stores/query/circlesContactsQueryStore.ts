import { createCirclesQueryStore } from './circlesQueryStore';
import { circles } from '$lib/stores/circles';
import type {
  CirclesEventType,
  TrustRelationRow,
  EventRow,
  CirclesQuery,
  AvatarRow,
} from '@circles-sdk/data';
import type { ContactList } from '../contacts';
import { getProfile } from '$lib/utils/profile';
import { get } from 'svelte/store';
import type { Address } from '@circles-sdk/utils';

interface ContactEventRow extends EventRow {
  data: ContactList;
}

export async function createContactsQueryStore(
  address: Address,
  refreshOnEvents?: Set<CirclesEventType>
) {
  const sdk = get(circles);
  if (!sdk) throw new Error('SDK not initialized');

  const createContactsQuery = async (): Promise<
    CirclesQuery<ContactEventRow>
  > => {
    const query = {
      currentPage: undefined,
      mutable: true,
      params: {},
      rpc: sdk.data.rpc,
      _calculatedColumns: [],
      buildCursorFilter: () => [],
      buildOrderBy: () => [],
      combineFilters: () => [],
      request: async () => ({ rows: [] }),
      rowsToObjects: (rows: any[]) => rows as ContactEventRow[],
      rowToCursor: () => '',
      getFirstAndLastCursor: () => ({ first: '', last: '' }),
      getSingleRow: async () => undefined,
      async queryNextPage(
        this: CirclesQuery<ContactEventRow>
      ): Promise<boolean> {
        if (this.currentPage && this.currentPage.results?.length > 0) {
          (this as any).currentPage = {
            results: [],
            hasMore: false,
          };
          return false;
        }

        const contacts = await sdk.data.getAggregatedTrustRelations(address);
        const enrichedContacts = await enrichContactData(contacts);

        const contactEventRow: ContactEventRow = {
          blockNumber: Date.now(),
          transactionIndex: 0,
          logIndex: 0,
          data: enrichedContacts,
        };

        (this as any).currentPage = {
          results: [contactEventRow],
          hasMore: false,
        };
        return false;
      },
    } as unknown as CirclesQuery<ContactEventRow>;
    return query;
  };

  const store = await createCirclesQueryStore<ContactEventRow>(
    createContactsQuery,
    refreshOnEvents
  );

  return {
    subscribe: (
      callback: (value: {
        data: ContactList;
        next: () => Promise<boolean>;
        ended: boolean;
      }) => void
    ) => {
      return store.subscribe((value) => {
        callback({
          data: value.data[0]?.data ?? {},
          next: value.next,
          ended: value.ended,
        });
      });
    },
  };
}

async function enrichContactData(
  rows: TrustRelationRow[]
): Promise<ContactList> {
  const profileRecord: ContactList = {};

  const promises = rows.map(async (row) => {
    const profile = await getProfile(row.objectAvatar);
    if (profile) {
      profileRecord[row.objectAvatar] = {
        contactProfile: profile,
        row: row,
      };
    }
  });

  await Promise.all(promises);

  const avatarInfos =
    (await get(circles)?.data.getAvatarInfoBatch(Object.keys(profileRecord) as Address[])) ??
    [];
  const avatarInfoRecord: Record<string, AvatarRow> = {};
  avatarInfos.forEach((info) => {
    avatarInfoRecord[info.avatar] = info;
  });

  Object.values(profileRecord).forEach((item) => {
    const info = avatarInfoRecord[item.row.objectAvatar];
    if (info) {
      item.avatarInfo = info;
    }
  });

  return profileRecord;
}
