import { createCirclesQueryStore } from './circlesQueryStore';
import { circles } from '$lib/stores/circles';
import type { CirclesEventType } from '@aboutcircles/sdk-rpc';
import type {
  EventRow,
  CirclesQuery,
  AvatarInfo,
  AggregatedTrustRelation,
} from '@aboutcircles/sdk-types';
import type { ContactList } from '../contacts';
import { getProfile, getCachedAvatarInfo } from '$lib/utils/profile';
import { get } from 'svelte/store';
import type { Address } from '@aboutcircles/sdk-types';
import type { Avatar } from '@aboutcircles/sdk';

interface ContactEventRow extends EventRow {
  data: ContactList;
}

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
    // Get RPC client - handle both old and new SDK
    let rpcClient;
    if ((sdk as any).rpc) {
      // New SDK
      rpcClient = (sdk as any).rpc;
    }

    // Fetch contacts data
    let contacts;
    if (avatar && typeof (avatar as any).trust?.getAll === 'function') {
      // Use new SDK method from avatar
      console.log('🔄 Using new SDK avatar.trust.getAll()');
      const allTrustRelations = await (avatar as any).trust.getAll();

      // Show all trust relations:
      // trustedBy = someone trusts you (they accept your tokens)
      // trusts = you trust them (you accept their tokens)
      // mutuallyTrusts = mutual trust
      const filteredContacts = allTrustRelations.filter(
        (contact: any) =>
          contact.relation === 'trusts' ||
          contact.relation === 'mutuallyTrusts' ||
          contact.relation === 'trustedBy'
      );

      console.log(
        `Total trust relations: ${allTrustRelations.length}, Filtered contacts (outgoing/mutual): ${filteredContacts.length}`
      );

      // Adapt new SDK format to old SDK format by adding missing fields
      contacts = filteredContacts.map((contact: any) => ({
        ...contact,
        versions: [2], // New SDK only works with V2
        versionSpecificRelations: { 2: contact.relation },
      }));
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
  const enrichedContacts: ContactList = {};

  // Fetch profiles and attach avatar info in a single combined operation
  // Avatar info is cached during profile fetch (from getAvatarInfoBatch),
  // so we retrieve it inline without additional API calls
  const promises = rows.map(async (row) => {
    const profile = await getProfile(row.objectAvatar);
    if (profile) {
      const lower = row.objectAvatar.toLowerCase() as Address;
      // Get avatar info from cache (populated during profile fetch)
      const cachedAvatarInfo = getCachedAvatarInfo([lower])[lower];

      enrichedContacts[row.objectAvatar] = {
        contactProfile: profile,
        avatarInfo: cachedAvatarInfo,
        row: row,
      };
    } else {
      console.warn(`No profile found for ${row.objectAvatar}`);
    }
  });

  await Promise.all(promises);
  console.log(
    `Final enriched contacts: ${Object.keys(enrichedContacts).length} out of ${rows.length}`
  );
  return enrichedContacts;
}
