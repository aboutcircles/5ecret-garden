import { get, derived } from "svelte/store";
import { avatar } from "$lib/stores/avatar"; // Avatar store
import type { CirclesEvent } from "@circles-sdk/data";
import type { ExtendedTrustRelationRow } from "../../routes/contacts/+page.svelte";
import { getProfile } from "$lib/components/Avatar.svelte"; // Circles SDK store
import type { Profile } from "@circles-sdk/profiles"; // Assuming Profile type exists

let setContactList: (contactList: Record<string, Profile>) => void;

/**
 * A store that contains the contact list (trust relations) for the current avatar.
 * The contact list is updated whenever a new trust event arrives in the event stream.
 */
export const contactList = derived<typeof avatar, Record<string, Profile>>(
    avatar,
    ($avatar, set) => {
        setContactList = set;
        set({}); // Initialize with an empty object

        if (!$avatar) {
            return;
        }

        const handleEvent = async (event: CirclesEvent) => {
            const trustEvents = ["CrcV1_Trust", "CrcV2_Trust", "CrcV2_InviteHuman"];
            if (!trustEvents.includes(event.$event)) {
                return;
            }

            try {
                await updateContacts();
            } catch (e) {
                console.error(`Failed to update the contact list on event ${event.$event}`, e);
            }
        };

        updateContacts()
            .then(() => $avatar.events.subscribe(handleEvent))
            .catch(e => console.error("Failed to initialize contacts store", e));

        return () => {
            $avatar.unsubscribeFromEvents();
        };
    }
);

export async function updateContacts() {
    const avatarInstance = get(avatar);
    if (!avatarInstance) {
        return;
    }

    const cachedContactList = get(contactList);
    if (!cachedContactList) {
        setContactList({});
    }

    const contacts = await avatarInstance.getTrustRelations();
    if (contacts && contacts.length > 0) {
        const enrichedContacts = await enrichContactData(contacts);
        setContactList(enrichedContacts);
    }
}

async function enrichContactData(rows: ExtendedTrustRelationRow[]): Promise<Record<string, Profile>> {
    const profileRecord: Record<string, Profile> = {};

    const promises = rows.map(async row => {
        const profile = await getProfile(row.objectAvatar);
        if (profile) {
            profileRecord[row.objectAvatar] = profile;
        }
    });

    await Promise.all(promises);

    return profileRecord;
}
