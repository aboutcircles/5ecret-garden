<script lang="ts">
  import type { Profile } from '@circles-sdk/profiles';

  export let profile: Profile | undefined;
  export let trustVersion: number | undefined = undefined;
</script>

<div class="w-full flex flex-col items-center space-y-2 text-center">
  <button class="cursor-pointer" on:click>
    <img
      src={profile?.previewImageUrl ?? '/default-avatar.png'}
      alt="User Icon"
      class="w-8 h-8 rounded-full"
    />
  </button>
  <div class="flex flex-col items-center">
    <span>{profile?.name}</span>
    <span class="text-sm text-gray-500">
      <slot></slot>
    </span>
    {#if trustVersion}
      <p class="text-xs text-yellow-500">
        {trustVersion == 1 ? 'This relation was made before migration' : ''}
      </p>
    {/if}
  </div>
</div>
