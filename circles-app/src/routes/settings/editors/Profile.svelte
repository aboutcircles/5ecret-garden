<script lang="ts" context="module">
    export async function createProfile(profile: any): Promise<string> {
        const response = await fetch("http://localhost:3000/pin", {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(profile),
        });

        if (!response.ok) {
            throw new Error('Failed to create profile');
        }

        const data = await response.json();
        return data.cid;
    }

    export async function retrieveProfile(cid: string): Promise<any> {
        const response = await fetch(`http://localhost:3000/get?cid=${cid}`);
        if (!response.ok) {
            throw new Error('Failed to retrieve profile');
        }

        return await response.json();
    }
</script>

<script lang="ts">
    import ActionButton from "$lib/components/ActionButton.svelte";
    import {avatar} from "$lib/stores/avatar";
    import ImageUpload from "$lib/components/ImageUpload.svelte";
    import {onMount} from "svelte";
    import {circles} from "$lib/stores/circles";
    import {cidV0ToUint8Array} from "@circles-sdk/utils/src";

    let name = "";
    let bio = "";
    /**
     * Meant to contain a data URL of a small version of the image
     */
    let previewImageUrl = "";
    /**
     * Meant to contain the URL to the actual image
     */
    let imageUrl = "";
    /**
     * The CID of the avatar's profile metadata
     */
    let cid = "";

    const profile = () => ({
        name,
        bio,
        previewImageUrl,
        imageUrl
    });

    onMount(retrieveProfileData);

    async function createOrUpdateProfile() {
        cid = await createProfile(profile());

        const receipt = await $circles?.nameRegistry?.updateMetadataDigest(cidV0ToUint8Array(cid));
        if (!receipt) {
            throw new Error('Failed to update metadata digest');
        }

        console.log(`Profile updated with CID: ${cid}`);
    }

    async function retrieveProfileData() {
        console.log($avatar?.avatarInfo);
        if (!$avatar?.avatarInfo?.cidV0) {
            return;
        }

        const profileData = await retrieveProfile($avatar.avatarInfo.cidV0);
        name = profileData.name;
        bio = profileData.bio;
        previewImageUrl = profileData.previewImageUrl;
        imageUrl = profileData.imageUrl;
    }

    $: avatarInfo = {
        address: $avatar?.address,
        tokenId: $avatar?.avatarInfo?.tokenId
    }
    const onNewImage = (e: any) => {
        console.log(e.detail);
        previewImageUrl = e.detail.dataUrl;
    }
    const onImageCleared = (e: any) => {
        console.log(e.detail);
    };
</script>

<div class="space-y-6">
    <div class="bg-white p-4 rounded shadow">
        <h2 class="text-lg font-medium">Personal Profile</h2>
        <div class="mt-3 space-y-2">
            <div>
                <label for="circlesAddress" class="block text-sm font-medium text-gray-700">Circles address</label>
                <input type="text" id="circlesAddress"
                       readonly
                       value={avatarInfo.address}
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                       placeholder="0x.....">
            </div>
            {#if $avatar?.avatarInfo?.v1Token && !$avatar?.avatarInfo?.v1Stopped}
                <div>
                    <label for="tokenAddress" class="block text-sm font-medium text-gray-700">Token address</label>
                    <input type="text" id="tokenAddress" class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                           readonly
                           value={$avatar.avatarInfo.v1Token}
                           placeholder="0x.....">
                </div>
            {/if}
            <div>
                <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
                <input bind:value={name} type="text" id="name"
                       class="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Name">
            </div>
            <div>
                <label for="description" class="block text-sm font-medium text-gray-700">Bio</label>
                <textarea bind:value={bio} id="bio"
                          class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                          placeholder="Bio"></textarea>
            </div>
            <div>
                <label for="imageUrl" class="block text-sm font-medium text-gray-700">Image</label>
            </div>
            <div>
                <ImageUpload imageDataUrl={previewImageUrl}
                             cropHeight={256} cropWidth={256}
                             on:newImage={onNewImage}
                             on:cleared={onImageCleared}></ImageUpload>
            </div>
            <ActionButton action={createOrUpdateProfile}
                          disabled={!name}>Save Profile
            </ActionButton>
        </div>
    </div>
</div>
