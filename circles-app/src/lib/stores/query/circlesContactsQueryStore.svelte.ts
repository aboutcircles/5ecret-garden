import { createCirclesQueryStore } from './circlesQueryStore';
import { circles } from '$lib/stores/circles';
import type { CirclesEventType } from '@aboutcircles/sdk-rpc';
import type {
  EventRow,
  CirclesQuery,
  AvatarInfo,
  AggregatedTrustRelation,
  TrustRelationInfo,
} from '@aboutcircles/sdk-types';
import type { ContactList } from '../contacts';
import { getProfile, getCachedAvatarInfo } from '$lib/utils/profile';
import { get } from 'svelte/store';
import type { Address } from '@aboutcircles/sdk-types';
import type { Avatar, Sdk } from '@aboutcircles/sdk';
import { getSdkFromAvatar } from '$lib/utils/avatarHelpers';
import {
  adaptTrustRelationsForV2,
  adaptTrustRelationInfosToAggregated,
  type TrustRelationType,
} from '$lib/utils/sdkAdapters';
import { getAggregatedTrustRelationsEnriched } from '$lib/utils/sdkHelpers';
import { handleWarning } from '$lib/utils/errorHandler';

interface ContactEventRow extends EventRow {
  data: ContactList;
}

/**
 * Creates a store for contacts (trust relations).
 *
 * **Pagination Design Note:**
 * This store intentionally loads ALL contacts in a single RPC call (`hasMore: false`).
 * Trust relations are typically a small dataset (<100-200 contacts for most users),
 * and loading them all at once provides better UX than paginating.
 *
 * The `getAggregatedTrustRelationsEnriched()` endpoint returns all trust relations
 * (mutual, trusts, trustedBy) with avatar info pre-loaded, optimized for this use case.
 */
export async function createContactsQueryStore(
  avatar: Avatar,
  _address: Address,
  refreshOnEvents?: Set<CirclesEventType>
) {
  const sdk = get(circles);
  if (!sdk) throw new Error('SDK not initialized');

  const createContactsQuery = async (): Promise<
    CirclesQuery<ContactEventRow>
  > => {
    // Fetch contacts using enriched endpoint - single RPC call with avatar info pre-loaded
    let contacts: AggregatedTrustRelation[] = [];
    const avatarAddress = avatar.address as Address;

    try {
      console.log('🔄 Using getAggregatedTrustRelationsEnriched (optimized single RPC)');
      const enrichedRelations = await getAggregatedTrustRelationsEnriched(sdk, avatarAddress);

      // Convert TrustRelationInfo arrays to AggregatedTrustRelation format
      // Categories: mutual (both trust each other), trusts (you trust them), trustedBy (they trust you)
      const mutualRelations = adaptTrustRelationInfosToAggregated(
        enrichedRelations.mutual || [],
        'mutuallyTrusts',
        avatarAddress
      );
      const trustsRelations = adaptTrustRelationInfosToAggregated(
        enrichedRelations.trusts || [],
        'trusts',
        avatarAddress
      );
      const trustedByRelations = adaptTrustRelationInfosToAggregated(
        enrichedRelations.trustedBy || [],
        'trustedBy',
        avatarAddress
      );

      // Combine all relations
      const allRelations = [...mutualRelations, ...trustsRelations, ...trustedByRelations];
      console.log(
        `Enriched trust relations: ${allRelations.length} (mutual: ${mutualRelations.length}, trusts: ${trustsRelations.length}, trustedBy: ${trustedByRelations.length})`
      );

      // Adapt to include V2 compatibility fields
      contacts = adaptTrustRelationsForV2(allRelations);
    } catch (error) {
      // Fallback to avatar.trust.getAll() if enriched endpoint fails
      handleWarning('Enriched contacts endpoint failed, using fallback', {
        notify: false,
        context: 'sdk',
      });
      if (avatar && typeof avatar.trust?.getAll === 'function') {
        const allTrustRelations = await avatar.trust.getAll();
        const filteredContacts = allTrustRelations.filter(
          (contact: AggregatedTrustRelation) =>
            contact.relation === 'trusts' ||
            contact.relation === 'mutuallyTrusts' ||
            contact.relation === 'trustedBy'
        );
        contacts = adaptTrustRelationsForV2(filteredContacts);
      }
    }

    const enrichedContacts = await enrichContactData(contacts || []);

    console.log(
      `Enriched contacts count: ${Object.keys(enrichedContacts).length}`
    );
    console.log(
      'Enriched contacts sample:',
      Object.keys(enrichedContacts).slice(0, 3)
    );

    const contactEventRow: ContactEventRow = {
      blockNumber: Date.now(),
      transactionIndex: 0,
      logIndex: 0,
      data: enrichedContacts,
    };

    const query = {
      rows: [contactEventRow],
      hasMore: false,
      async nextPage(
        this: CirclesQuery<ContactEventRow>
      ): Promise<CirclesQuery<ContactEventRow>> {
        // No pagination for contacts - return same query with empty rows
        return {
          rows: [],
          hasMore: false,
          nextPage: async () => this,
        } as CirclesQuery<ContactEventRow>;
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
  rows: AggregatedTrustRelation[]
): Promise<ContactList> {
  console.log(`Enriching ${rows.length} contacts...`);
  const profileRecord: ContactList = {};

  // Step 1: Fetch profiles for all contacts
  const promises = rows.map(async (row) => {
    try {
      const profile = await getProfile(row.objectAvatar);
      if (profile) {
        profileRecord[row.objectAvatar] = {
          contactProfile: profile,
          row: row,
        };
      } else {
        console.warn(`No profile found for ${row.objectAvatar}`);
      }
    } catch (error) {
      console.error(`Error fetching profile for ${row.objectAvatar}:`, error);
    }
  });

  await Promise.all(promises);
  console.log(
    `Profiles fetched: ${Object.keys(profileRecord).length} out of ${rows.length}`
  );

  // Step 2: Try to use cached avatar info first (populated during profile fetch)
  const addresses = Object.keys(profileRecord) as Address[];
  console.log(`Using cached avatar info for ${addresses.length} addresses...`);
  const cachedAvatarInfoRecord = getCachedAvatarInfo(addresses);

  const avatarInfoRecord: Record<string, AvatarInfo> = {};
  let missingAddresses: Address[] = [];

  Object.entries(cachedAvatarInfoRecord).forEach(([addr, info]) => {
    if (info && info.avatar) {
      avatarInfoRecord[info.avatar] = info;
    } else if (addr) {
      missingAddresses.push(addr as Address);
    }
  });

  console.log(`Avatar infos from cache: ${Object.keys(avatarInfoRecord).length}, Missing: ${missingAddresses.length}`);

  // Step 3: If some avatar info is missing, fetch it directly as fallback
  const sdk = get(circles);
  if (missingAddresses.length > 0 && sdk) {
    try {
      console.log(`Fetching ${missingAddresses.length} missing avatar infos...`);
      // Use SDK's RPC methods directly (properly typed)
      if (typeof sdk.rpc?.avatar?.getAvatarInfoBatch === 'function') {
        const fetchedAvatarInfos = await sdk.rpc.avatar.getAvatarInfoBatch(missingAddresses);

        fetchedAvatarInfos?.forEach((info: AvatarInfo) => {
          if (info && info.avatar) {
            const lower = info.avatar.toLowerCase();
            avatarInfoRecord[lower] = info;
          }
        });
        console.log(`Fetched ${fetchedAvatarInfos?.length ?? 0} missing avatar infos`);
      }
    } catch (error) {
      console.error(`Error fetching missing avatar info:`, error);
    }
  }

  // Step 4: Attach avatar info to contacts
  Object.values(profileRecord).forEach((item) => {
    const info = avatarInfoRecord[item.row.objectAvatar.toLowerCase()];
    if (info) {
      item.avatarInfo = info;
    }
  });

  console.log(`Final enriched contacts: ${Object.keys(profileRecord).length}`);
  return profileRecord;
}
