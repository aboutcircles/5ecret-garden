<script lang="ts">
    import {goto} from "$app/navigation";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {ethers} from "ethers";
    import {avatar} from "$lib/stores/avatar";
    import {circles} from "$lib/stores/circles";
    import type {AvatarRow} from "@circles-sdk/data";
    import {inviteHuman} from "$lib/actions/inviteHuman";

    let contactAddress = "";

    async function trust() {
        await $avatar?.trust(contactAddress);
        await goto("/contacts");
    }

    async function invite() {
        await inviteHuman(contactAddress);
        await goto("/contacts");
    }

    let contactAvatarInfo: AvatarRow | undefined;

    async function loadContactAvatarInfo() {
        contactAvatarInfo = await $circles?.data.getAvatarInfo(contactAddress);
    }

    $: contactAddressIsValid = ethers.isAddress(contactAddress);
    $: {
        if (contactAddressIsValid) {
            loadContactAvatarInfo();
        } else {
            contactAvatarInfo = undefined;
        }
    }
</script>

<div class="space-y-6">
    <div class="bg-white p-4 rounded shadow">
        <h2 class="text-lg font-medium">Add contact</h2>
        <div class="mt-3 space-y-2">
            <div>
                <label for="circlesAddress" class="block text-sm font-medium text-gray-700">Circles address</label>
                <input bind:value={contactAddress}
                       type="text" id="circlesAddress"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                       placeholder="0x.....">
            </div>
            <ActionButton action={trust} disabled={!contactAddressIsValid || !contactAvatarInfo}>
                Trust
            </ActionButton>
            <ActionButton action={invite} disabled={!contactAddressIsValid || contactAvatarInfo?.version === 2}>
                Invite
            </ActionButton>
        </div>
    </div>
</div>
