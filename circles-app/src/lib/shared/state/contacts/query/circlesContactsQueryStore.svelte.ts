import { createCirclesQueryStore } from '$lib/shared/state/query';
import { circles } from '$lib/shared/state/circles';
import type {
  CirclesEventType,
  AggregatedTrustRelation,
  EventRow,
  CirclesQuery,
  AvatarRow,
  AvatarInfo,
} from '@aboutcircles/sdk-types';
import type { ContactList } from '$lib/shared/state/contacts';
import { getProfilesCoreBatch, type ProfileAddress } from '$lib/shared/model/profile';
import { get } from 'svelte/store';
import type { Address } from '@aboutcircles/sdk-types';
import type { Avatar, Sdk } from '@aboutcircles/sdk';
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
    // Fetch contacts eagerly so the CirclesQuery has data on .rows immediately
    const contacts = await trustDataSource.getAggregatedTrustRelations(address);
    const enrichedContacts = await enrichContactData(contacts, address, sdk);

    const contactEventRow: ContactEventRow = {
      blockNumber: Date.now(),
      transactionIndex: 0,
      logIndex: 0,
      data: enrichedContacts,
    };

    const query: CirclesQuery<ContactEventRow> = {
      rows: [contactEventRow],
      hasMore: false,
      async nextPage(): Promise<CirclesQuery<ContactEventRow>> {
        // No further pages — return empty result
        return {
          rows: [],
          hasMore: false,
          nextPage: this.nextPage,
        };
      },
    };
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
  rows: AggregatedTrustRelation[],
  ownerAddress: Address | undefined,
  sdk: Sdk
): Promise<ContactList> {
  const profileRecord: ContactList = {};

  const filteredRows = ownerAddress
    ? rows.filter((row) => row.objectAvatar !== ownerAddress)
    : rows;

  // Avoid N+1 profile fetches by using the existing batched core-profile pipeline.
  const addresses = [...new Set(filteredRows.map((r) => r.objectAvatar).filter(Boolean))];
  const normalized = addresses.map((a) => a!.toLowerCase() as ProfileAddress);
  const profileByAddress = await getProfilesCoreBatch(normalized);
  for (const row of filteredRows) {
    const profile = row.objectAvatar ? profileByAddress.get(row.objectAvatar.toLowerCase() as ProfileAddress) : undefined;
    if (profile && row.objectAvatar) {
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
  const avatarInfoRecord: Record<string, AvatarInfo> = {};
  avatarInfos.forEach((info) => {
    if (info) avatarInfoRecord[info.avatar] = info;
  });

  Object.values(profileRecord).forEach((item) => {
    const info = item.row.objectAvatar ? avatarInfoRecord[item.row.objectAvatar] : undefined;
    if (info) {
      item.avatarInfo = info as unknown as AvatarRow;
    }
  });

  return profileRecord;
}