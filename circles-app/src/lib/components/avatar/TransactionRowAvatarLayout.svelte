<script lang="ts">
  import type { Profile } from '@circles-sdk/profiles';

  export let profile: Profile | undefined;
  export let imageStyle: 'square' | 'circle' = 'circle';
  export let pictureOverlayUrl: string | undefined = undefined;
</script>

<div class="inline-flex items-center space-x-2">
  <button class="cursor-pointer" on:click>
    <div class="indicator">
      <span class="indicator-item badge bg-blue-100">
        <img
          src={pictureOverlayUrl}
          alt="Overlay"
          class="h-6"
          class:rounded-full={imageStyle === 'circle'}
        />
      </span>
      <img
        src={profile?.previewImageUrl}
        alt="User Icon"
        class="w-8 h-8"
        class:rounded-full={imageStyle === 'circle'}
      />
    </div>
  </button>
  <div class="flex flex-col items-start">
    <slot></slot>
    <span class="font-semibold">{profile?.name}</span>
    <p class="flex flex-col items-start text-xs text-gray-500"></p>
  </div>
</div>
