<script lang="ts">
    import {avatar} from "$lib/stores/avatar";
    import ImageUpload from "$lib/components/ImageUpload.svelte";
    import type {Profile} from "@circles-sdk/profiles";

    export let profile: Profile = {
        name: '',
        description: '',
        previewImageUrl: '',
        imageUrl: ''
    };

    export let showCustomizableFields: boolean = true;

    const onNewImage = (e: any) => {
        profile.previewImageUrl = e.detail.dataUrl;
        profile = profile;
    }

    const onImageCleared = (e: any) => {
        profile.previewImageUrl = '';
        profile = profile;
    };
</script>

<div class="mt-3 space-y-2">
    {#if $avatar}
        <div>
            <label for="circlesAddress" class="block text-sm font-medium text-gray-700">Circles address</label>
            <input type="text" id="circlesAddress"
                   readonly
                   value={$avatar?.avatarInfo?.avatar}
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
    {/if}
    {#if showCustomizableFields}
        <div>
            <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
            <input bind:value={profile.name} type="text" id="name"
                   class="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Name">
        </div>
        <div>
            <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
            <textarea bind:value={profile.description} id="description"
                      class="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                      placeholder="Description"></textarea>
        </div>
        <div>
            <label for="imageUrl" class="block text-sm font-medium text-gray-700">Image</label>
        </div>
        <div>
            <ImageUpload imageDataUrl={profile.previewImageUrl}
                         cropHeight={256} cropWidth={256}
                         on:newImage={onNewImage}
                         on:cleared={onImageCleared}></ImageUpload>
        </div>
    {/if}
</div>
