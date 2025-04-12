import { get } from 'svelte/store';
import { avatarState } from '$lib/stores/avatar.svelte';
import type {
  AvatarRow,
  CirclesEventType,
  TrustRelationRow,
} from '@circles-sdk/data';
import type { Profile } from '@circles-sdk/profiles';
import { circles } from '$lib/stores/circles';
import { getProfile } from '$lib/utils/profile';
import { writable } from 'svelte/store';
import { createContactsQueryStore } from './query/circlesContactsQueryStore';
import type { Address } from '@circles-sdk/utils';

export type ContactListItem = {
  contactProfile: Profile;
  avatarInfo?: AvatarRow;
  row: TrustRelationRow;
};

export type ContactList = Record<string, ContactListItem>;

const refreshOnEvents: Set<CirclesEventType> = new Set([
  'CrcV1_Trust',
  'CrcV2_Trust',
  'CrcV2_InviteHuman',
]);

let currentStoreUnsubscribe: (() => void) | undefined;
let currentQuery: Promise<any> | undefined;

export const contacts = writable<{
  data: ContactList;
  next: () => Promise<boolean>;
  ended: boolean;
}>({ data: {}, next: async () => false, ended: false });
if (avatarState.avatar) {
  if (currentStoreUnsubscribe) {
    currentStoreUnsubscribe();
  }

  currentQuery = createContactsQueryStore(avatarState.avatar.address, refreshOnEvents);
  currentQuery.then((store) => {
    currentStoreUnsubscribe = store.subscribe(contacts.set);
  });
} else {
  if (currentStoreUnsubscribe) {
    currentStoreUnsubscribe();
    currentStoreUnsubscribe = undefined;
  }
  currentQuery = undefined;
  contacts.set({
    data: {},
    next: async () => false,
    ended: true,
  });
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

  const avatarInfos: AvatarRow[] =
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
