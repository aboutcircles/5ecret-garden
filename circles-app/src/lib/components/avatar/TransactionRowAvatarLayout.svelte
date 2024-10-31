<script lang="ts">
  import { getTimeAgo } from '$lib/utils/shared';
  import type { Profile } from '@circles-sdk/profiles';

  export let profile: Profile | undefined;
  export let pictureOverlayUrl: string | undefined = undefined;
  export let date: number;
</script>

<div class="inline-flex items-center space-x-2">
  <button class="cursor-pointer" on:click>
    <div class="relative">
      <img
        src={pictureOverlayUrl}
        alt="Badge"
        class="w-6 h-6 absolute bottom-0 right-0 transform translate-x-1 translate-y-1"
      />
      <img
        src={profile?.previewImageUrl}
        alt="User Icon"
        class="w-10 h-10 rounded-full"
      />
    </div>
  </button>
  <div class="flex flex-col items-start">
    <slot></slot>
    <span class="font-medium">{profile?.name}</span>
    <p class="text-xs md:text-sm text-gray-500">{getTimeAgo(date)}</p>
  </div>
</div>
