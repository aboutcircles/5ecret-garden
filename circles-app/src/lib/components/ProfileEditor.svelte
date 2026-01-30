<script lang="ts">
  import MarkdownEditor from '$lib/components/markdown/MarkdownEditor.svelte';
  import { avatarState } from '$lib/stores/avatar.svelte';
  import ImageUpload from '$lib/components/ImageUpload.svelte';
  import type { AppProfile as Profile } from '$lib/profiles';
  import { normalizeMarkdownInput, sanitizeText } from '$lib/utils/isValid';

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
        onnewimage={onnewimage} 
        onclearall={oncleared} 
      />
    </div>
  {/if}
</div>
