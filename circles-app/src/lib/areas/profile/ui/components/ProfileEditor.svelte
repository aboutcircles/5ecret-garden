<script lang="ts">
  import MarkdownEditor from '$lib/shared/ui/content/markdown/MarkdownEditor.svelte';
  import { avatarState } from '$lib/shared/state/avatar.svelte';
  import ImageUpload from '$lib/shared/ui/profile/components/ImageUpload.svelte';
  import {
    PROFILE_IMAGE_CROP_HEIGHT,
    PROFILE_IMAGE_CROP_WIDTH,
    PROFILE_IMAGE_MAX_BYTES,
    PROFILE_IMAGE_OUTPUT_MIME,
    PROFILE_IMAGE_OUTPUT_QUALITY,
  } from '$lib/shared/ui/profile/profileImagePolicy';
  import type { AppProfile as Profile } from '$lib/shared/model/profile';
  import { sanitizeText } from '$lib/shared/utils/isValid';

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

  $effect(() => {
    profile.name = sanitizeText(profile.name);
  });
</script>

<div class="space-y-4">
  {#if avatarState.avatar}
    <label class="form-control">
      <span class="label-text">Circles address</span>
      <input type="text" readonly class="input input-bordered w-full" value={avatarState.avatar?.avatarInfo?.avatar} />
    </label>

    {#if avatarState.avatar?.avatarInfo?.v1Token && !avatarState.avatar?.avatarInfo?.v1Stopped}
      <label class="form-control">
        <span class="label-text">Token address</span>
        <input type="text" readonly class="input input-bordered w-full" value={avatarState.avatar.avatarInfo.v1Token} />
      </label>
    {/if}
  {/if}

  {#if showCustomizableFields}
    <label class="form-control">
      <span class="label-text">Name</span>
      <input id="name" type="text" class="input input-bordered w-full" bind:value={profile.name} placeholder="Name" />
    </label>

    <label class="form-control">
      <span class="label-text">Description</span>
      <MarkdownEditor
        bind:value={profile.description}
        placeholder="Write a description (Markdown supported)…"
      />
    </label>

    <label class="form-control">
      <span class="label-text">Location</span>
      <input type="text" class="input input-bordered w-full" bind:value={profile.location} placeholder="Location" />
    </label>

    <div>
      <span class="label-text">Image</span>
      <ImageUpload 
        imageDataUrls={profile.previewImageUrl ? [profile.previewImageUrl] : []}
        cropWidth={PROFILE_IMAGE_CROP_WIDTH}
        cropHeight={PROFILE_IMAGE_CROP_HEIGHT}
        cropMime={PROFILE_IMAGE_OUTPUT_MIME}
        cropQuality={PROFILE_IMAGE_OUTPUT_QUALITY}
        maxBytes={PROFILE_IMAGE_MAX_BYTES}
        onnewimage={onnewimage} 
        onclearall={oncleared} 
      />
    </div>
  {/if}
</div>
