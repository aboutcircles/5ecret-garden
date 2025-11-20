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
  if (missingAddresses.length > 0 && get(circles)) {
    try {
      console.log(`Fetching ${missingAddresses.length} missing avatar infos...`);
      const sdk = get(circles);
      if (typeof (sdk as any).rpc?.avatar?.getAvatarInfoBatch === 'function') {
        const fetchedAvatarInfos = await (sdk as any).rpc.avatar.getAvatarInfoBatch(missingAddresses);

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
