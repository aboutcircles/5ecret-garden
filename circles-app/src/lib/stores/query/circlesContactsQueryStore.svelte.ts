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
import type { Avatar } from '@circles-sdk/sdk';

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

    const query = {
      currentPage: undefined,
      mutable: true,
      params: {},
      rpc: rpcClient,
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

        // Check if we have the new SDK with avatar.trust.getAll()
        let contacts;
        if (avatar && typeof (avatar as any).trust?.getAll === 'function') {
          // Use new SDK method from avatar
          console.log('🔄 Using new SDK avatar.trust.getAll()');
          const allTrustRelations = await (avatar as any).trust.getAll();

          // Show all trust relations:
          // trustedBy = someone trusts you (they accept your tokens)
          // trusts = you trust them (you accept their tokens)
          // mutuallyTrusts = mutual trust
          const filteredContacts = allTrustRelations.filter((contact: any) =>
            contact.relation === 'trusts' || contact.relation === 'mutuallyTrusts' || contact.relation === 'trustedBy'
          );

          console.log(`Total trust relations: ${allTrustRelations.length}, Filtered contacts (outgoing/mutual): ${filteredContacts.length}`);

          // Adapt new SDK format to old SDK format by adding missing fields
          contacts = filteredContacts.map((contact: any) => ({
            ...contact,
            versions: [2], // New SDK only works with V2
            versionSpecificRelations: { 2: contact.relation }
          }));
        }

        const enrichedContacts = await enrichContactData(contacts);

        console.log(`Enriched contacts count: ${Object.keys(enrichedContacts).length}`);
        console.log('Enriched contacts sample:', Object.keys(enrichedContacts).slice(0, 3));

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
  console.log(`Enriching ${rows.length} contacts...`);
  const profileRecord: ContactList = {};

  const promises = rows.map(async (row) => {
    const profile = await getProfile(row.objectAvatar);
    if (profile) {
      profileRecord[row.objectAvatar] = {
        contactProfile: profile,
        row: row,
      };
    } else {
      console.warn(`No profile found for ${row.objectAvatar}`);
    }
  });

  await Promise.all(promises);
  console.log(`Profiles fetched: ${Object.keys(profileRecord).length} out of ${rows.length}`);

  const sdk = get(circles);
  let avatarInfos = [];

  if (sdk) {
    const addresses = Object.keys(profileRecord) as Address[];
    console.log(`Fetching avatar info for ${addresses.length} addresses...`);
    if (typeof (sdk as any).data?.getAvatarInfoBatch === 'function') {
      // Old SDK
      avatarInfos = await (sdk as any).data.getAvatarInfoBatch(addresses) ?? [];
    } else if (typeof (sdk as any).rpc?.avatar?.getAvatarInfoBatch === 'function') {
      // New SDK - use RPC directly
      avatarInfos = await (sdk as any).rpc.avatar.getAvatarInfoBatch(addresses) ?? [];
    }
    console.log(`Avatar infos received: ${avatarInfos.length}`);
  }

  const avatarInfoRecord: Record<string, AvatarRow> = {};
  avatarInfos.forEach((info: any) => {
    if (info && info.avatar) {
      avatarInfoRecord[info.avatar] = info;
    }
  });

  Object.values(profileRecord).forEach((item) => {
    const info = avatarInfoRecord[item.row.objectAvatar];
    if (info) {
      item.avatarInfo = info;
    }
  });

  console.log(`Final enriched contacts: ${Object.keys(profileRecord).length}`);
  return profileRecord;
}
