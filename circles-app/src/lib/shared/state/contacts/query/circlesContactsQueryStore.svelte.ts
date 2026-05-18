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
import { createGroupDataSource } from '$lib/shared/data/circles/groupDataSource';
import { isGroupType } from '$lib/shared/utils/avatarHelpers';

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
  const groupDataSource = createGroupDataSource(sdk);
  const subjectIsGroup = isGroupType(avatar.avatarInfo?.type);

  const createContactsQuery = async (): Promise<
    CirclesQuery<ContactEventRow>
  > => {
    // Group members live in V_CrcV2.GroupMemberships, not the trust-relations view.
    // For human/org avatars the trust path is correct; for groups it returns the
    // inverse (counterparties trusting the group) and misses actual members.
    const contacts = subjectIsGroup
      ? await fetchGroupMembersAsRelations(groupDataSource, address)
      : await trustDataSource.getAggregatedTrustRelations(address);
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
  rows: AggregatedTrustRelation[],
  ownerAddress: Address | undefined,
  sdk: Sdk
): Promise<ContactList> {
  const profileRecord: ContactList = {};

  // Normalize comparison so mixed-case addresses don't leak the owner through
  const ownerLower = ownerAddress?.toLowerCase();
  const filteredRows = ownerLower
    ? rows.filter((row) => row.objectAvatar?.toLowerCase() !== ownerLower)
    : rows;

  // Avoid N+1 profile fetches by using the existing batched core-profile pipeline.
  const addresses = [...new Set(filteredRows.map((r) => r.objectAvatar).filter(Boolean))];
  const normalized = addresses.map((a) => a!.toLowerCase() as ProfileAddress);

  let profileByAddress: Map<ProfileAddress, any>;
  try {
    profileByAddress = await getProfilesCoreBatch(normalized);
  } catch (e) {
    console.warn('[Contacts] Profile batch fetch failed, proceeding without profiles:', e);
    profileByAddress = new Map();
  }

  for (const row of filteredRows) {
    if (!row.objectAvatar) continue;
    const profile = profileByAddress.get(row.objectAvatar.toLowerCase() as ProfileAddress);
    // Always add the contact — profile enrichment is optional
    profileRecord[row.objectAvatar] = {
      contactProfile: profile ?? { name: row.objectAvatar },
      row: row,
    };
  }

  const avatarDataSource = createAvatarDataSource(sdk);
  const avatarInfos = await avatarDataSource.getAvatarInfoBatch(
    Object.keys(profileRecord) as Address[]
  );
  const avatarInfoRecord: Record<string, AvatarInfo> = {};
  avatarInfos.forEach((info) => {
    // Key by lowercase so lookup is case-insensitive
    if (info) avatarInfoRecord[info.avatar.toLowerCase()] = info;
  });

  Object.values(profileRecord).forEach((item) => {
    const info = item.row.objectAvatar
      ? avatarInfoRecord[item.row.objectAvatar.toLowerCase()]
      : undefined;
    if (info) {
      item.avatarInfo = info as unknown as AvatarRow;
    }
  });

  return profileRecord;
}

async function fetchGroupMembersAsRelations(
  groupDataSource: ReturnType<typeof createGroupDataSource>,
  group: Address
): Promise<AggregatedTrustRelation[]> {
  const members = await groupDataSource.getGroupMembers(group);
  return members.map((row) => ({
    subjectAvatar: row.group as Address,
    relation: 'trusts' as const,
    objectAvatar: row.member as Address,
    timestamp: row.timestamp,
  }));
}