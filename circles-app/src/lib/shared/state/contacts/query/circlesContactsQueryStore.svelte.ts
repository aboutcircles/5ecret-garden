import { createCirclesQueryStore } from '$lib/shared/state/query';
import { circles } from '$lib/shared/state/circles';
import type {
  CirclesEventType,
  TrustRelationRow,
  EventRow,
  CirclesQuery,
  AvatarRow,
} from '@circles-sdk/data';
import type { ContactList } from '$lib/shared/state/contacts';
import { getProfilesCoreBatch, type ProfileAddress } from '$lib/shared/model/profile';
import { get } from 'svelte/store';
import type { Address } from '@circles-sdk/utils';
import type { Avatar, Sdk } from '@circles-sdk/sdk';
import { createTrustDataSource } from '$lib/shared/data/circles/trustDataSource';
import { createAvatarDataSource } from '$lib/shared/data/circles/avatarDataSource';

interface ContactEventRow extends EventRow {
  data: ContactList;
}

export async function createContactsQueryStore(
  avatar: Avatar,
  address: Address,
  refreshOnEvents?: Set<CirclesEventType>
) {
  const sdk = get(circles);
  if (!sdk) throw new Error('SDK not initialized');
  const trustDataSource = createTrustDataSource(sdk);

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

        const contacts = await trustDataSource.getAggregatedTrustRelations(address);
        const enrichedContacts = await enrichContactData(contacts, address, sdk);

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
    avatar,
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
        const hasLoadedSnapshot = (value.data?.length ?? 0) > 0;
        callback({
          data: value.data[0]?.data ?? {},
          next: value.next,
          // Contacts are delivered as a single aggregated snapshot row.
          // Once that row is present, the list is effectively loaded/ended.
          ended: value.ended || hasLoadedSnapshot,
        });
      });
    },
  };
}

async function enrichContactData(
  rows: TrustRelationRow[],
  ownerAddress: Address | undefined,
  sdk: Sdk
): Promise<ContactList> {
  const profileRecord: ContactList = {};

  const filteredRows = ownerAddress
    ? rows.filter((row) => row.objectAvatar !== ownerAddress)
    : rows;

  // Avoid N+1 profile fetches by using the existing batched core-profile pipeline.
  const addresses = [...new Set(filteredRows.map((r) => r.objectAvatar))];
  const normalized = addresses.map((a) => a.toLowerCase() as ProfileAddress);
  const profileByAddress = await getProfilesCoreBatch(normalized);
  for (const row of filteredRows) {
    const profile = profileByAddress.get(row.objectAvatar.toLowerCase() as ProfileAddress);
    if (profile) {
      profileRecord[row.objectAvatar] = {
        contactProfile: profile,
        row: row,
      };
    }
  }

  const avatarDataSource = createAvatarDataSource(sdk);
  const avatarInfos = await avatarDataSource.getAvatarInfoBatch(
    Object.keys(profileRecord) as Address[]
  );
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