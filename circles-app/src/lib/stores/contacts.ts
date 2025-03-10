import { get } from 'svelte/store';
import { avatar } from '$lib/stores/avatar';
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

const _contacts = writable<{
  data: ContactList;
  next: () => Promise<boolean>;
  ended: boolean;
}>({ data: {}, next: async () => false, ended: false });

avatar.subscribe(($avatar) => {
  if ($avatar) {
    if (currentStoreUnsubscribe) {
      currentStoreUnsubscribe();
    }

    currentQuery = createContactsQueryStore($avatar.address, refreshOnEvents);
    currentQuery.then((store) => {
      currentStoreUnsubscribe = store.subscribe(_contacts.set);
    });
  } else {
    if (currentStoreUnsubscribe) {
      currentStoreUnsubscribe();
      currentStoreUnsubscribe = undefined;
    }
    currentQuery = undefined;
    _contacts.set({
      data: {},
      next: async () => false,
      ended: true,
    });
  }
});

export const contacts = _contacts;

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
    (await get(circles)?.data.getAvatarInfoBatch(Object.keys(profileRecord))) ??
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
