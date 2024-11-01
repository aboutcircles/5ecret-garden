<script lang="ts">
  import type { Profile } from '@circles-sdk/profiles';

  export let profile: Profile | undefined;
  export let imageStyle: 'square' | 'circle' = 'circle';
  export let showName: boolean = true;
  export let pictureOverlayUrl: string | undefined = undefined;
  export let trustVersion: number | undefined = undefined;
</script>

<div class="w-full flex flex-col items-center space-y-4 p-4 text-center">
  <button class="cursor-pointer" on:click>
    <img
      src={profile?.previewImageUrl ?? '/default-avatar.png'}
      alt="User Icon"
      class="w-20 h-20 rounded-full object-cover"
    />
  </button>
  <div class="flex flex-col items-center">
    {#if showName}
      <span class="font-bold text-lg">{profile?.name}</span>
    {/if}
    {#if profile?.description}
      <p class="text-sm text-gray-500 mt-0">
        {profile?.description}
        <slot></slot>
        <!-- For additional description -->
      </p>
    {:else}
      <p class="text-sm text-gray-500">
        <slot></slot>
        <!-- For additional description -->
      </p>
    {/if}
    {#if trustVersion}
      <p class="text-xs text-yellow-500">
        {trustVersion == 1 ? 'This relation was made before migration' : ''}
      </p>
    {/if}
  </div>
</div>
