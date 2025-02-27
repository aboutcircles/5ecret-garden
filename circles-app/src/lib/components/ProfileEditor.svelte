<script lang="ts">
    import ImageUpload from "$lib/components/ImageUpload.svelte";
    import type {Profile} from "@circles-sdk/profiles";

    export let profile: Profile = {
        name: '',
        description: '',
        previewImageUrl: '',
        imageUrl: ''
    };

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
</div>
