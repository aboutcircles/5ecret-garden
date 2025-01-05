<script lang="ts">
  import type { Profile } from '@circles-sdk/profiles';

  export let profile: Profile | undefined;
  export let pictureOverlayUrl: string | undefined = undefined;
  // export let topInfo: string | undefined = undefined;
  // export let bottomInfo: string | undefined = undefined;
</script>

<div class="w-full flex flex-col items-center p-4 text-center">
  <button class="cursor-pointer" on:click>
    {#if pictureOverlayUrl}
      <div class="indicator">
        <img
          src={profile?.previewImageUrl}
          alt="User Icon"
          class="w-20 h-20 object-cover rounded-full"
        />
        <img src={pictureOverlayUrl} alt="Overlay" class="indicator-item indicator-bottom h-5 w-5 rounded-full border border-white translate-y-[8%] translate-x-[10%] bg-white" />
      </div>
    {:else}
      <img
        src={profile?.previewImageUrl}
        alt="User Icon"
        class="w-20 h-20 object-cover rounded-full"
      />
    {/if}
  </button>
  <div class="flex flex-col items-center p-4 gap-y-0.5">
    <!-- {#if topInfo}
      <p class="text-xs text-gray-500">
        {topInfo}
      </p>
    {/if} -->
    <span class="font-semibold text-[#161616]">{profile?.name}</span>
    {#if profile?.description}
      <p class="text-sm text-gray-500 mt-0">
        {profile?.description}
      </p>
    {/if}
    <!-- {#if bottomInfo}
      <p class="text-xs text-gray-500">
        {bottomInfo}
      </p>
    {/if} -->
  </div>
</div>
