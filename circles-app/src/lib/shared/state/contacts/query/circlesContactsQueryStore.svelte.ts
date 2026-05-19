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

  // Match the transaction-history page size for a fast first paint; further
  // pages stream in via VirtualList's scroll-driven prefetch.
  const GROUP_MEMBERS_PAGE_SIZE = 25;

  const createContactsQuery = async (): Promise<
    CirclesQuery<ContactEventRow>
  > => {
    // Resolve the avatar type lazily so a race during init (avatarInfo not yet
    // attached) doesn't lock the store onto the wrong path for the lifetime of
    // the subscription. If avatarInfo is missing, fetch it from the SDK.
    let avatarType: string | undefined = avatar.avatarInfo?.type;
    if (!avatarType) {
      const info = await sdk.data.getAvatar(address).catch((e) => {
        console.warn('[Contacts] getAvatar lookup failed; defaulting to trust path', e);
        return null;
      });
      avatarType = info?.type;
    }
    const subjectIsGroup = isGroupType(avatarType);

    if (subjectIsGroup) {
      // Progressive cursor pagination. Each call to fetchNextGroupPage produces
      // one ContactEventRow holding that page's slice of members. The store
      // accumulates rows across pages and the subscriber merges them.
      let cursor: string | null = null;
      let exhausted = false;

      const fetchNextGroupPage = async (): Promise<CirclesQuery<ContactEventRow>> => {
        if (exhausted) {
          return { rows: [], hasMore: false, nextPage: fetchNextGroupPage };
        }
        const requestedCursor = cursor;
        const page = await groupDataSource.getGroupMembersPage(
          address,
          requestedCursor,
          GROUP_MEMBERS_PAGE_SIZE
        );

        // Treat an empty results page as terminal regardless of hasMore — protects
        // against a server bug returning `results:[], hasMore:true` which would
        // otherwise cause VirtualList to spin-loop on prefetch.
        if (page.results.length === 0) {
          exhausted = true;
          cursor = null;
          return { rows: [], hasMore: false, nextPage: fetchNextGroupPage };
        }

        const relations: AggregatedTrustRelation[] = page.results.map((row) => ({
          subjectAvatar: row.group as Address,
          relation: 'trusts' as const,
          objectAvatar: row.member as Address,
          timestamp: row.timestamp,
        }));
        // Enrich BEFORE committing cursor advance so a transient failure can be
        // retried on the same cursor without skipping the page.
        const enriched = await enrichContactData(relations, address, sdk);

        cursor = page.nextCursor;
        const hasMore = page.hasMore && cursor !== null;
        exhausted = !hasMore;

        const row: ContactEventRow = {
          blockNumber: Date.now(),
          transactionIndex: 0,
          logIndex: 0,
          data: enriched,
        };
        return { rows: [row], hasMore, nextPage: fetchNextGroupPage };
      };

      return fetchNextGroupPage();
    }

    const contacts = await trustDataSource.getAggregatedTrustRelations(address);
    const enrichedContacts = await enrichContactData(contacts, address, sdk);

    const contactEventRow: ContactEventRow = {
      blockNumber: Date.now(),
      transactionIndex: 0,
      logIndex: 0,
      data: enrichedContacts,
    };

    const noMore = async (): Promise<CirclesQuery<ContactEventRow>> => ({
      rows: [],
      hasMore: false,
      nextPage: noMore,
    });
    return { rows: [contactEventRow], hasMore: false, nextPage: noMore };
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
        // Pages arrive as separate ContactEventRow snapshots. Merge them so the
        // page sees one ContactList regardless of how many pages have loaded.
        const merged: ContactList = {};
        for (const row of value.data ?? []) {
          Object.assign(merged, row.data);
        }
        callback({
          data: merged,
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

