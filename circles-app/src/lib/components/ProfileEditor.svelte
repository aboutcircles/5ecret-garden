<script lang="ts">
  import { avatar } from '$lib/stores/avatar';
  import ImageUpload from '$lib/components/ImageUpload.svelte';
  import type { Profile } from '@circles-sdk/profiles';


  interface Props {
    profile: Profile;
    showCustomizableFields?: boolean;
  }

  let { profile = $bindable(), showCustomizableFields = true }: Props = $props();

  const onnewimage = (dataUrl: string) => {
    profile.previewImageUrl = dataUrl;
  };

  const oncleared = () => {
    profile.previewImageUrl = '';
    profile = profile;
  };
</script>

<div class="space-y-2">
  {#if $avatar}
    <div>
      <label for="circlesAddress" class="block text-sm font-medium text-black"
        >Circles address</label
      >
      <input
        type="text"
        id="circlesAddress"
        readonly
        value={$avatar?.avatarInfo?.avatar}
        class="mt-2 block w-full p-2 border border-gray-300 rounded-md"
        placeholder="0x....."
      />
    </div>
    {#if $avatar?.avatarInfo?.v1Token && !$avatar?.avatarInfo?.v1Stopped}
      <div>
        <label for="tokenAddress" class="block text-sm font-medium text-black"
          >Token address</label
        >
        <input
          type="text"
          id="tokenAddress"
          class="mt-2 block w-full p-2 border border-gray-300 rounded-md"
          readonly
          value={$avatar.avatarInfo.v1Token}
          placeholder="0x....."
        />
      </div>
    {/if}
  {/if}
  {#if showCustomizableFields}
    <div>
      <label for="name" class="block text-sm font-medium text-black">Name</label
      >
      <input
        bind:value={profile.name}
        type="text"
        id="name"
        class="mt-2 block w-full p-2 border border-gray-300 bg-gray-50 rounded-md"
        placeholder="Name"
      />
    </div>
    <div>
      <label for="description" class="block text-sm font-medium text-black"
      >Description</label
      >
      <textarea
        bind:value={profile.description}
        id="description"
        class="mt-2 block w-full p-2 border border-gray-300 bg-gray-50 rounded-md"
        placeholder="Description"
      ></textarea>
    </div>
    <div>
      <label for="description" class="block text-sm font-medium text-black"
      >Location</label
      >
      <input
        bind:value={profile.location}
        type="text"
        id="name"
        class="mt-2 block w-full p-2 border border-gray-300 bg-gray-50 rounded-md"
        placeholder="Location" />
    </div>
    <div>
      <label for="imageUrl" class="block text-sm font-medium text-black"
        >Image</label
      >
    </div>
    <div>
      <ImageUpload
        imageDataUrl={profile.previewImageUrl}
        cropHeight={256}
        cropWidth={256}
        onnewimage={onnewimage}
        oncleared={oncleared}
      />
    </div>
  {/if}
</div>
