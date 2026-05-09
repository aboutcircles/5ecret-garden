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
  import { T } from '$lib/design-system/tokens.js';

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

  const inputStyle = `width:100%;padding:10px 14px;border:1px solid ${T.hairline};border-radius:10px;font-family:${T.fontSans};font-size:13px;color:${T.ink};background:${T.surface};box-sizing:border-box;`;
  const readonlyInputStyle = `width:100%;padding:10px 14px;border:1px solid ${T.hairlineSoft};border-radius:10px;font-family:${T.fontMono};font-size:11.5px;color:${T.inkMuted};background:${T.surfaceAlt};box-sizing:border-box;`;
  const eyebrowStyle = `font-size:10px;font-weight:600;color:${T.inkMuted};letter-spacing:0.06em;text-transform:uppercase;margin:0 0 6px 2px;display:block;`;
</script>

<div style="display:flex;flex-direction:column;gap:16px;">
  {#if avatarState.avatar}
    <label style="display:flex;flex-direction:column;">
      <span style={eyebrowStyle}>Circles address</span>
      <input type="text" readonly style={readonlyInputStyle} value={avatarState.avatar?.avatarInfo?.avatar} />
    </label>

    {#if avatarState.avatar?.avatarInfo?.v1Token && !avatarState.avatar?.avatarInfo?.v1Stopped}
      <label style="display:flex;flex-direction:column;">
        <span style={eyebrowStyle}>Token address</span>
        <input type="text" readonly style={readonlyInputStyle} value={avatarState.avatar.avatarInfo.v1Token} />
      </label>
    {/if}
  {/if}

  {#if showCustomizableFields}
    <label style="display:flex;flex-direction:column;">
      <span style={eyebrowStyle}>Name</span>
      <input id="name" type="text" style={inputStyle} bind:value={profile.name} placeholder="Name" />
    </label>

    <div style="display:flex;flex-direction:column;">
      <span style={eyebrowStyle}>Description</span>
      <MarkdownEditor
        bind:value={profile.description}
        placeholder="Write a description (Markdown supported)…"
      />
    </div>

    <label style="display:flex;flex-direction:column;">
      <span style={eyebrowStyle}>Location</span>
      <input type="text" style={inputStyle} bind:value={profile.location} placeholder="Location" />
    </label>

    <div style="display:flex;flex-direction:column;">
      <span style={eyebrowStyle}>Image</span>
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
