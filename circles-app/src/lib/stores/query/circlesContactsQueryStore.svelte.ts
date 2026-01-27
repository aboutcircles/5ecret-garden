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
      console.log('[Contacts] Using getAggregatedTrustRelationsEnriched (optimized single RPC)');
      const rpcStartTime = performance.now();
      const enrichedRelations = await getAggregatedTrustRelationsEnriched(sdk, avatarAddress);
      console.log(`[Contacts] RPC call completed in ${(performance.now() - rpcStartTime).toFixed(0)}ms`);

      // DEBUG: If enriched returns empty, check if fallback has data (to detect backend bug)
      const enrichedTotal = (enrichedRelations.mutual?.length ?? 0) +
                           (enrichedRelations.trusts?.length ?? 0) +
                           (enrichedRelations.trustedBy?.length ?? 0);
      if (enrichedTotal === 0 && avatar && typeof avatar.trust?.getAll === 'function') {
        console.log('[Contacts] DEBUG: Enriched returned 0, checking fallback for comparison...');
        try {
          const fallbackData = await avatar.trust.getAll();
          console.log('[Contacts] DEBUG: Fallback avatar.trust.getAll() returned:', fallbackData?.length ?? 0);
          if (fallbackData?.[0]) console.log('[Contacts] DEBUG: Sample fallback:', fallbackData[0]);

          // If fallback has data but enriched doesn't, use fallback instead
          if (fallbackData && fallbackData.length > 0) {
            console.warn('[Contacts] BACKEND BUG: Enriched endpoint returned 0 but fallback has', fallbackData.length, 'relations. Using fallback.');
            const filteredContacts = fallbackData.filter(
              (contact: AggregatedTrustRelation) =>
                contact.relation === 'trusts' ||
                contact.relation === 'mutuallyTrusts' ||
                contact.relation === 'trustedBy'
            );
            contacts = adaptTrustRelationsForV2(filteredContacts);
            // Skip the enriched data processing below
            throw new Error('SKIP_TO_FALLBACK');
          }
        } catch (debugError) {
          if ((debugError as Error).message === 'SKIP_TO_FALLBACK') throw debugError;
          console.log('[Contacts] DEBUG: Fallback check failed:', debugError);
        }
      }

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
      console.log('[Contacts] Combined relations:', {
        mutual: mutualRelations.length,
        trusts: trustsRelations.length,
        trustedBy: trustedByRelations.length,
        total: allRelations.length,
      });
      if (allRelations[0]) {
        console.log('[Contacts] Sample combined relation:', allRelations[0]);
      }

      // Adapt to include V2 compatibility fields
      contacts = adaptTrustRelationsForV2(allRelations);
    } catch (error) {
      // Handle fallback skip (when enriched returned empty but fallback has data)
      if ((error as Error).message === 'SKIP_TO_FALLBACK') {
        console.log('[Contacts] Using fallback data instead of empty enriched response');
        // contacts already set in the debug block above
      } else {
        // Fallback to avatar.trust.getAll() if enriched endpoint fails
        console.warn('[Contacts] Enriched endpoint failed:', error);
        handleWarning('Enriched contacts endpoint failed, using fallback', {
          notify: false,
          context: 'sdk',
        });
        if (avatar && typeof avatar.trust?.getAll === 'function') {
          console.log('[Contacts] Attempting fallback: avatar.trust.getAll()');
          const allTrustRelations = await avatar.trust.getAll();
          console.log('[Contacts] Fallback trust.getAll() returned:', allTrustRelations?.length ?? 0);
          if (allTrustRelations?.[0]) {
            console.log('[Contacts] Sample fallback relation:', allTrustRelations[0]);
          }
          const filteredContacts = allTrustRelations.filter(
            (contact: AggregatedTrustRelation) =>
              contact.relation === 'trusts' ||
              contact.relation === 'mutuallyTrusts' ||
              contact.relation === 'trustedBy'
          );
          console.log('[Contacts] Filtered fallback contacts:', filteredContacts.length);
          contacts = adaptTrustRelationsForV2(filteredContacts);
        } else {
          console.error('[Contacts] No fallback available - avatar.trust.getAll not found');
        }
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
  const startTime = performance.now();
  console.log(`[Contacts] Enriching ${rows.length} contacts...`);
  const profileRecord: ContactList = {};

  // Step 1: Fetch profiles for all contacts
  const profileStartTime = performance.now();
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
  const profileTime = performance.now() - profileStartTime;
  console.log(
    `[Contacts] Profiles fetched: ${Object.keys(profileRecord).length} out of ${rows.length} in ${profileTime.toFixed(0)}ms`
  );

  // Step 2: Try to use cached avatar info first (populated during profile fetch)
  const avatarInfoStartTime = performance.now();
  const addresses = Object.keys(profileRecord) as Address[];
  console.log(`[Contacts] Using cached avatar info for ${addresses.length} addresses...`);
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
      // Use SDK's RPC methods directly (properly typed)
      if (typeof sdk.rpc?.avatar?.getAvatarInfoBatch === 'function') {
        const fetchedAvatarInfos = await sdk.rpc.avatar.getAvatarInfoBatch(missingAddresses);
        let fetchedCount = 0;
        fetchedAvatarInfos?.forEach((info: AvatarInfo) => {
          if (info && info.avatar) {
            const lower = info.avatar.toLowerCase();
            avatarInfoRecord[lower] = info;
            fetchedCount++;
          }
        });
        console.log(`Avatar info batch: requested ${missingAddresses.length}, found ${fetchedCount} registered`);
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

  const avatarInfoTime = performance.now() - avatarInfoStartTime;
  const totalTime = performance.now() - startTime;
  console.log(`[Contacts] Avatar info processing: ${avatarInfoTime.toFixed(0)}ms`);
  console.log(`[Contacts] TOTAL enrichment: ${totalTime.toFixed(0)}ms for ${Object.keys(profileRecord).length} contacts`);
  return profileRecord;
}
